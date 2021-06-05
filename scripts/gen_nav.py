#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_nav.py — 自动为所有 Markdown 文章生成「上一篇 | 返回目录 | 下一篇」导航
并同步更新 README.md 目录

用法：
    python3 scripts/gen_nav.py          # 在项目根目录执行
    python3 scripts/gen_nav.py --check  # 仅检查，不写入（CI 用）

规则：
    - 章节目录：以 数字- 开头的一级子目录（如 01-java-basic）
    - 文章顺序：按文件名字典序排序（文件名前缀数字保证顺序）
    - 导航块用 <!-- nav-start --> ... <!-- nav-end --> 包裹，可幂等重复执行
"""

import os
import re
import sys
import glob

# ── 配置 ──────────────────────────────────────────────────────────────────────

# 项目根目录（脚本相对位置：scripts/gen_nav.py）
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 章节目录匹配规则（以数字开头的一级目录）
CHAPTER_PATTERN = re.compile(r"^\d+-.+$")

# 章节 emoji 映射（按目录名前缀匹配，找不到则用默认）
CHAPTER_EMOJI = {
    "01": "☕",
    "02": "🌱",
    "03": "🗄️",
    "04": "🐘",
    "05": "🔴",
    "06": "📨",
    "07": "🔍",
    "08": "🏗️",
    "09": "⚙️",
}
DEFAULT_EMOJI = "📄"

NAV_START = "<!-- nav-start -->"
NAV_END   = "<!-- nav-end -->"

# ── 工具函数 ──────────────────────────────────────────────────────────────────

def get_emoji(dir_name: str) -> str:
    prefix = dir_name.split("-")[0]
    return CHAPTER_EMOJI.get(prefix, DEFAULT_EMOJI)


def get_chapter_title(dir_name: str) -> str:
    """从目录名提取章节标题，如 01-java-basic → Java Basic"""
    parts = dir_name.split("-", 1)
    return parts[1].replace("-", " ").title() if len(parts) > 1 else dir_name


def get_article_title(file_path: str) -> str:
    """读取 md 文件第一个 # 标题，找不到则用文件名"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                # 跳过导航块内的内容
                stripped = line.strip()
                if stripped.startswith("# "):
                    return stripped[2:].strip()
    except Exception:
        pass
    # fallback：去掉数字前缀和扩展名
    name = os.path.splitext(os.path.basename(file_path))[0]
    name = re.sub(r"^\d+-?", "", name)
    return name


def strip_nav(content: str) -> str:
    """移除文件中已有的导航块（幂等）"""
    pattern = re.escape(NAV_START) + r".*?" + re.escape(NAV_END)
    content = re.sub(r"\n*" + pattern + r"\n*", "\n", content, flags=re.DOTALL)
    return content.strip()


def make_nav_block(prev_art, next_art, cur_dir: str) -> str:
    """生成一个导航块字符串"""
    parts = []

    if prev_art:
        rel = _rel_path(cur_dir, prev_art["dir"], prev_art["file"])
        parts.append(f"[⬅️ 上一篇：{prev_art['title']}]({rel})")
    else:
        parts.append("⬅️ 上一篇：无")

    parts.append("[🏠 返回目录](../README.md)")

    if next_art:
        rel = _rel_path(cur_dir, next_art["dir"], next_art["file"])
        parts.append(f"[下一篇：{next_art['title']} ➡️]({rel})")
    else:
        parts.append("下一篇：无 ➡️")

    nav_line = " | ".join(parts)
    return f"{NAV_START}\n\n---\n\n{nav_line}\n\n{NAV_END}"


def _rel_path(cur_dir: str, target_dir: str, target_file: str) -> str:
    """计算相对路径"""
    if cur_dir == target_dir:
        return target_file
    return f"../{target_dir}/{target_file}"


# ── 核心逻辑 ──────────────────────────────────────────────────────────────────

def collect_articles():
    """
    扫描项目目录，按章节目录名排序，章节内按文件名排序，
    返回有序的文章列表。
    """
    chapters = []
    for entry in sorted(os.listdir(BASE)):
        full = os.path.join(BASE, entry)
        if os.path.isdir(full) and CHAPTER_PATTERN.match(entry):
            md_files = sorted(
                f for f in os.listdir(full) if f.endswith(".md")
            )
            if md_files:
                chapters.append({"dir": entry, "files": md_files})

    all_articles = []
    for ch in chapters:
        for fname in ch["files"]:
            fpath = os.path.join(BASE, ch["dir"], fname)
            title = get_article_title(fpath)
            all_articles.append({
                "dir":   ch["dir"],
                "file":  fname,
                "title": title,
                "path":  fpath,
            })
    return all_articles, chapters


def update_article_nav(articles: list, check_only: bool = False) -> int:
    """为每篇文章写入/更新导航块，返回修改文件数"""
    changed = 0
    for i, art in enumerate(articles):
        prev_art = articles[i - 1] if i > 0 else None
        next_art = articles[i + 1] if i < len(articles) - 1 else None

        nav_block = make_nav_block(prev_art, next_art, art["dir"])

        with open(art["path"], "r", encoding="utf-8") as f:
            original = f.read()

        body = strip_nav(original)
        new_content = nav_block + "\n\n" + body + "\n\n" + nav_block + "\n"

        if new_content != original:
            changed += 1
            if not check_only:
                with open(art["path"], "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"  [更新] {art['dir']}/{art['file']}")
            else:
                print(f"  [需更新] {art['dir']}/{art['file']}")

    return changed


def update_readme(articles: list, chapters_meta: list, check_only: bool = False) -> bool:
    """重新生成 README.md 的目录部分"""
    readme_path = os.path.join(BASE, "README.md")

    # 构建目录内容
    toc_lines = []
    chapter_map = {ch["dir"]: ch["files"] for ch in chapters_meta}

    # 按章节分组
    chapter_articles = {}
    for art in articles:
        chapter_articles.setdefault(art["dir"], []).append(art)

    for ch_dir in sorted(chapter_articles.keys()):
        arts = chapter_articles[ch_dir]
        emoji = get_emoji(ch_dir)
        ch_title = get_chapter_title(ch_dir)
        # 章节序号
        num = ch_dir.split("-")[0].lstrip("0") or "0"
        toc_lines.append(f"\n### {emoji} {num}、{ch_title}\n")
        toc_lines.append("| # | 文章 |")
        toc_lines.append("|---|------|")
        for art in arts:
            idx = os.path.splitext(art["file"])[0].split("-")[0]
            toc_lines.append(f"| {idx} | [{art['title']}]({art['dir']}/{art['file']}) |")

    toc_content = "\n".join(toc_lines)

    # 统计
    total = len(articles)
    tree_lines = []
    for ch_dir in sorted(chapter_articles.keys()):
        count = len(chapter_articles[ch_dir])
        emoji = get_emoji(ch_dir)
        tree_lines.append(f"├── {ch_dir:<35} {emoji}（{count} 篇）")
    if tree_lines:
        tree_lines[-1] = tree_lines[-1].replace("├──", "└──")
    tree_content = "\n".join(tree_lines)

    readme_content = f"""# Java Interview Guide

> 🎯 一份系统化的 Java 后端面试知识库，覆盖核心基础、框架原理、数据库、缓存、消息队列、搜索引擎、设计模式与软件工程。

---

## 📚 目录
{toc_content}

---

## 🗺️ 知识体系总览

```
Java Interview Guide
{tree_content}
```

> 共 **{total} 篇**文章，每篇文章顶部和底部均有上一篇 / 下一篇导航，支持连续阅读。
"""

    if os.path.exists(readme_path):
        with open(readme_path, "r", encoding="utf-8") as f:
            old = f.read()
        if old == readme_content:
            return False

    if not check_only:
        with open(readme_path, "w", encoding="utf-8") as f:
            f.write(readme_content)
        print(f"  [更新] README.md")
    else:
        print(f"  [需更新] README.md")
    return True


# ── 入口 ──────────────────────────────────────────────────────────────────────

def main():
    check_only = "--check" in sys.argv

    print("🔍 扫描文章...")
    articles, chapters_meta = collect_articles()
    print(f"   共发现 {len(articles)} 篇文章，{len(chapters_meta)} 个章节\n")

    print("📝 更新文章导航...")
    changed = update_article_nav(articles, check_only)

    print("\n📖 更新 README 目录...")
    readme_changed = update_readme(articles, chapters_meta, check_only)

    print()
    if check_only:
        if changed > 0 or readme_changed:
            print(f"❌ 有 {changed} 篇文章导航 + README 需要更新，请先运行 python3 scripts/gen_nav.py")
            sys.exit(1)
        else:
            print("✅ 所有导航均为最新，无需更新")
    else:
        if changed == 0 and not readme_changed:
            print("✅ 所有导航均为最新，无需更新")
        else:
            print(f"✅ 完成！更新了 {changed} 篇文章导航" + ("，并更新了 README" if readme_changed else ""))


if __name__ == "__main__":
    main()
