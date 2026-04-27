#!/usr/bin/env python3
"""
本地开发替代脚本（当 `mkdocs serve` 热加载在当前环境失效时使用）

用法:
    python tools/dev_serve.py

特性:
- 用 watchdog inotify 直接监听 docs/、mkdocs.yml、overrides/
- 检测到变化就跑 `mkdocs build --dirty`（dirty 只重建变化的页面）
- 起一个 HTTP 服务器服务 site/ 目录
- 可选：注入一个轮询脚本让浏览器每 2 秒检查一次并自动刷新

启动后浏览器打开 http://127.0.0.1:8000/
"""
from __future__ import annotations

import http.server
import os
import socketserver
import subprocess
import sys
import threading
import time
from pathlib import Path

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

ROOT = Path(__file__).resolve().parent.parent
DOCS_DIR = ROOT / "docs"
SITE_DIR = ROOT / "site"
CONFIG_FILE = ROOT / "mkdocs.yml"
OVERRIDES_DIR = ROOT / "overrides"
HOST = "127.0.0.1"
PORT = 8000

# 防抖：连续变更时只跑一次构建
DEBOUNCE_SECONDS = 0.8

# 忽略的路径前缀（绝对路径）
_IGNORE_PREFIXES = tuple(
    str(ROOT / p) for p in (
        "site", ".git", "__pycache__", ".mypy_cache", ".venv", "node_modules",
    )
)

# 忽略的文件相对路径（完整匹配）—— 这些文件由 hooks / gen_nav.py 生成，避免触发循环
# - docs/index.md : 由 hooks/gen_index.py 和 tools/gen_nav.py 生成
# - mkdocs.yml    : 由 tools/gen_nav.py 写入（nav 块），gen_nav 触发后不应再次触发 build
# - tools/doc_id_registry.json : 由 tools/gen_nav.py 写入
_IGNORE_REL_FILES = {
    "docs/index.md",
    "mkdocs.yml",
    "tools/doc_id_registry.json",
}

# gen_nav.py 路径
GEN_NAV_SCRIPT = ROOT / "tools" / "gen_nav.py"

# mermaid 语法写实校验脚本（需要 Node + `npm install` 安装依赖）
# 支持 `--files a.md,b.md` 增量校验模式；读不到/没有 node 命令时在 _run_check_mermaid 里静默跳过
CHECK_MERMAID_SCRIPT = ROOT / "tools" / "check_mermaid.mjs"
NODE_EXE = "node"

# 自动刷新脚本：注入到每个 HTML 尾部，每 2 秒查一次 /__ts__
_RELOAD_SCRIPT = """
<script>
(function(){
  console.log('[dev_serve] auto-reload script loaded at', new Date().toISOString());
  var last = null;
  setInterval(function(){
    fetch('/__ts__', {cache:'no-store'}).then(function(r){return r.text();}).then(function(t){
      if (last === null) { last = t; console.log('[dev_serve] initial ts=', t); return; }
      if (t !== last) {
        console.log('[dev_serve] ts changed', last, '->', t, ', reloading...');
        location.reload();
      }
    }).catch(function(e){ console.warn('[dev_serve] poll failed', e); });
  }, 2000);
})();
</script>
"""


class Builder:
    def __init__(self):
        self._lock = threading.Lock()
        self._pending = False
        self._last_ts = 0.0
        self._timer: threading.Timer | None = None
        # build 执行期间的"静默窗口"：此刻之前到现在收到的事件全部丢弃
        # 用于避免 build 过程中写入的文件（hooks 生成、自身写入等）触发新一轮 build
        self._silent_until = 0.0
        self.building = False
        # 标记本次 build 前是否需要先跑 gen_nav.py（由 md 新增/删除/重命名事件触发）
        self._pending_full = False
        self._pending_gen_nav = False
        # 本轮需要增量校验 mermaid 语法的 md 文件（绝对路径）；为空则跳过校验
        self._pending_md_files: set[str] = set()

    def is_silenced(self) -> bool:
        return self.building or time.time() < self._silent_until

    def trigger(
        self,
        reason: str,
        full_rebuild: bool = False,
        needs_gen_nav: bool = False,
        md_file: str | None = None,
    ):
        if self.is_silenced():
            # build 期间产生的事件直接忽略，避免死循环
            return
        with self._lock:
            tags = []
            if full_rebuild:
                tags.append("全量重建")
            if needs_gen_nav:
                tags.append("同步 nav")
            suffix = f"（{' + '.join(tags)}）" if tags else ""
            print(f"[watch] 检测到变化: {reason}{suffix}", flush=True)
            if full_rebuild:
                self._pending_full = True
            if needs_gen_nav:
                self._pending_gen_nav = True
                # gen_nav 会重写 mkdocs.yml 的 nav，必须走全量重建才能被 mkdocs 感知
                self._pending_full = True
            if md_file:
                self._pending_md_files.add(md_file)
            if self._timer is not None:
                self._timer.cancel()
            self._timer = threading.Timer(DEBOUNCE_SECONDS, self._run)
            self._timer.daemon = True
            self._timer.start()

    def _run_gen_nav(self) -> bool:
        """跑一次 tools/gen_nav.py，返回是否成功。失败不阻塞后续 build。"""
        if not GEN_NAV_SCRIPT.exists():
            return False
        print("[gen_nav] 同步 docs/index.md 与 mkdocs.yml nav ...", flush=True)
        start = time.time()
        res = subprocess.run(
            [sys.executable, str(GEN_NAV_SCRIPT)],
            cwd=str(ROOT),
        )
        cost = time.time() - start
        if res.returncode == 0:
            print(f"[gen_nav] 完成 ({cost:.1f}s)", flush=True)
            return True
        print(f"[gen_nav] 失败, 退出码 {res.returncode}（跳过，不影响 build）", flush=True)
        return False

    def _run_check_mermaid(self, md_files: list[str]) -> None:
        """增量校验传入的 md 文件里的 mermaid 语法。失败只打红日志，不阻塞 build。

        设计考量：
        - dev 体验优先：mermaid 写错了仍应当正常出站，让用户在浏览器里看到红色错误页；
          这里额外在终端给一个精确的文件:行号 + 第几个 mermaid 块的提示。
        - 没装 node / node_modules 时静默跳过，dev_serve 本身无硬依赖。
        """
        if not md_files:
            return
        if not CHECK_MERMAID_SCRIPT.exists():
            return
        # node_modules 不在就跳过，避免在没跑过 npm install 的环境报负日志
        if not (ROOT / "node_modules" / "mermaid").exists():
            return
        # 忽略不在 docs/ 下的 md（比如 overrides/ 里的模板片段）；check_mermaid 只校 docs
        docs_prefix = str(DOCS_DIR) + os.sep
        targets = [p for p in md_files if p.startswith(docs_prefix) and os.path.exists(p)]
        if not targets:
            return
        print(f"[mermaid] 校验 {len(targets)} 个 md 文件中的 mermaid 代码块 ...", flush=True)
        start = time.time()
        try:
            res = subprocess.run(
                [
                    NODE_EXE,
                    str(CHECK_MERMAID_SCRIPT),
                    "--files",
                    ",".join(targets),
                ],
                cwd=str(ROOT),
            )
        except FileNotFoundError:
            # 没装 node，静默退出，并提示一次
            print("[mermaid] 未找到 node 命令，跳过校验（安装 Node 后运行 `npm install` 即可启用）", flush=True)
            return
        cost = time.time() - start
        if res.returncode == 0:
            print(f"[mermaid] 通过 ({cost:.1f}s)", flush=True)
        else:
            print(
                f"[mermaid] ❌ 校验未通过 ({cost:.1f}s)，详见上方错误日志；仍继续 build，请浏览器刷新后对照页面修正。",
                flush=True,
            )

    def _run(self):
        with self._lock:
            self.building = True
            try:
                # 1. 若有 md 新增/删除/重命名，先同步 nav
                if self._pending_gen_nav:
                    self._run_gen_nav()
                    self._pending_gen_nav = False
                # 2. 增量校验变更的 md 中 mermaid 语法（不阻塞 build）
                md_files = sorted(self._pending_md_files)
                self._pending_md_files.clear()
                if md_files:
                    self._run_check_mermaid(md_files)
                # 3. 默认 dirty 构建；被标记为全量时走 full build
                full = self._pending_full
                cmd = ["mkdocs", "build"] if full else ["mkdocs", "build", "--dirty"]
                self._pending_full = False
                print(f"[build] {' '.join(cmd)} ...", flush=True)
                start = time.time()
                res = subprocess.run(
                    cmd,
                    cwd=str(ROOT),
                )
                cost = time.time() - start
                if res.returncode == 0:
                    self._last_ts = time.time()
                    print(f"[build] 完成 ({cost:.1f}s), 浏览器将在 2s 内自动刷新", flush=True)
                else:
                    print(f"[build] 失败, 退出码 {res.returncode}", flush=True)
            finally:
                # 构建后再静默 1.5 秒，消化 mkdocs 写完 site/ 之后的滞后事件
                self._silent_until = time.time() + 1.5
                self.building = False

    @property
    def timestamp(self) -> str:
        return str(int(self._last_ts * 1000))


class EventHandler(FileSystemEventHandler):
    # 仅以下事件类型被视为"真正的文件变更"，其它（opened、closed_no_write 等）全部忽略
    _VALID_EVENT_TYPES = {"modified", "created", "moved", "deleted"}
    # 会影响 nav 结构的事件类型：新增 / 删除 / 重命名；modified 只改正文不动 nav
    _NAV_AFFECTING_EVENT_TYPES = {"created", "deleted", "moved"}

    def __init__(self, builder: Builder):
        self.builder = builder

    def _should_ignore(self, path: str) -> bool:
        # 忽略常见编辑器临时文件
        name = os.path.basename(path)
        if name.startswith(".") or name.endswith("~"):
            return True
        if name.endswith((".swp", ".swx", ".tmp")):
            return True
        return False

    def on_any_event(self, event):
        # 只处理"实质性"文件事件，拦截 opened / closed_no_write 等 IDE 打开/只读访问事件
        if event.event_type not in self._VALID_EVENT_TYPES:
            return
        if event.is_directory:
            return
        if self._should_ignore(event.src_path):
            return
        # 忽略构建产物、版本控制、虚拟环境等目录
        if event.src_path.startswith(_IGNORE_PREFIXES):
            return
        # 只关心 md / yml / 模板 / 静态资源 / puml 片段
        if not event.src_path.endswith(
            (".md", ".yml", ".yaml", ".html", ".css", ".js", ".mjs", ".svg", ".png", ".py", ".puml")
        ):
            return
        rel = os.path.relpath(event.src_path, str(ROOT))
        # 忽略 hooks 生成的文件（避免循环）
        if rel in _IGNORE_REL_FILES:
            return
        # 这几类文件被任意 md 依赖（或改变构建行为），需要全量重建
        #   - .puml  : 被 hooks/inject_plantuml_style.py 注入到所有 kroki-plantuml 代码块
        #   - .py    : hook 脚本本身的改动
        #   - .yml   : mkdocs.yml 配置改动
        full_rebuild = event.src_path.endswith((".puml", ".py", ".yml", ".yaml"))
        # md 的新增 / 删除 / 重命名会影响 nav 结构，需要先跑 gen_nav.py 同步
        # docs/ 目录下的 md 才需要 nav 同步（overrides/ 里的 md 模板片段不算）
        needs_gen_nav = (
            event.src_path.endswith(".md")
            and event.event_type in self._NAV_AFFECTING_EVENT_TYPES
            and rel.startswith("docs" + os.sep)
        )
        # md 的 modified / created / moved 都可能涉及 mermaid 内容变更；
        # deleted 没有文件可校，不计入增量集合
        md_file = (
            event.src_path
            if (
                event.src_path.endswith(".md")
                and event.event_type != "deleted"
                and rel.startswith("docs" + os.sep)
            )
            else None
        )
        self.builder.trigger(
            f"{event.event_type} {rel}",
            full_rebuild=full_rebuild,
            needs_gen_nav=needs_gen_nav,
            md_file=md_file,
        )


class ServerHandler(http.server.SimpleHTTPRequestHandler):
    builder: Builder  # 由闭包注入

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE_DIR), **kwargs)

    def log_message(self, format, *args):
        # 安静一点, 只打 error
        pass

    def do_GET(self):
        if self.path == "/__ts__":
            body = self.builder.timestamp.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return
        # 默认静态服务
        # 但如果是 .html, 我们注入刷新脚本
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            path = os.path.join(path, "index.html")
        if path.endswith(".html") and os.path.isfile(path):
            try:
                with open(path, "rb") as f:
                    content = f.read()
                idx = content.rfind(b"</body>")
                if idx == -1:
                    content = content + _RELOAD_SCRIPT.encode()
                else:
                    content = content[:idx] + _RELOAD_SCRIPT.encode() + content[idx:]
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(content)
                return
            except OSError:
                pass
        return super().do_GET()


class ReusableTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    print(f"[init] 项目根目录: {ROOT}")

    # 1. 首次启动先跑一次 gen_nav.py，保证冷启动时 nav 与 docs/ 实际文件一致
    if GEN_NAV_SCRIPT.exists():
        print("[init] 同步 nav（首次启动）...")
        subprocess.run(
            [sys.executable, str(GEN_NAV_SCRIPT)],
            cwd=str(ROOT),
            check=False,
        )

    # 2. 首次构建
    if not SITE_DIR.exists() or not any(SITE_DIR.iterdir()):
        print("[init] 首次构建 site/ ...")
        subprocess.run(["mkdocs", "build"], cwd=str(ROOT), check=False)

    builder = Builder()
    builder._last_ts = time.time()

    # 2. 启动文件监听
    handler = EventHandler(builder)
    observer = Observer()
    for p in (DOCS_DIR, OVERRIDES_DIR):
        if p.exists():
            observer.schedule(handler, str(p), recursive=True)
            print(f"[watch] 监听目录: {p}")
    # 监听 mkdocs.yml 需要 watch 其父目录（inotify 不能直接监听单文件的修改，需要监听目录）
    # 但父目录是项目根目录，必须结合 EventHandler 里的路径过滤避免误触
    if CONFIG_FILE.exists():
        observer.schedule(handler, str(CONFIG_FILE.parent), recursive=False)
        print(f"[watch] 监听文件（仅 mkdocs.yml）: {CONFIG_FILE}")
    observer.start()

    # 3. 启动 HTTP 服务器
    ServerHandler.builder = builder
    httpd = ReusableTCPServer((HOST, PORT), ServerHandler)
    print(f"[serve] http://{HOST}:{PORT}/  (Ctrl+C 退出)")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[exit] 停止中 ...")
    finally:
        observer.stop()
        observer.join()
        httpd.server_close()


if __name__ == "__main__":
    sys.exit(main() or 0)
