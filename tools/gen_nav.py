#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_nav.py — 自动维护 docs/index.md 与 mkdocs.yml nav

用法：
    python3 tools/gen_nav.py          # 在项目根目录执行
    python3 tools/gen_nav.py --check  # 仅检查，不写入（CI 用）

功能：
    - 从 README.md 技术栈表格读取领域→目录映射
    - 生成 docs/index.md（技术栈总览 + 文档数量）
    - 更新 mkdocs.yml 的 nav 部分
    - 为每篇文章补全 frontmatter title
"""

import os
import re
import sys
import json
import yaml

# ── 路径配置 ──────────────────────────────────────────────────────────────────

# 项目根目录（脚本位置：tools/gen_nav.py）
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS_DIR = os.path.join(BASE, "docs")

# ── 扫描配置 ──────────────────────────────────────────────────────────────────

# 章节目录匹配规则（以数字开头的一级目录，如 01-java-basic）
CHAPTER_PATTERN = re.compile(r"^\d+-.+$")

# 排除整个章节目录（填写目录名）
EXCLUDE_DIRS: list[str] = ["10-project-experience"]

# 排除具体文章（填写 "目录名/文件名"）
EXCLUDE_FILES: list[str] = [
    # "01-java-basic/07-[Java8]Lambda表达式.md",
]

# ── README 解析 ───────────────────────────────────────────────────────────────

# 匹配技术领域列中隐藏的目录注释，格式：<!-- dir:目录名 -->
_DIR_COMMENT = re.compile(r"<!--\s*dir:([\w,\-]+)\s*-->")


def _parse_readme_rows() -> list[dict]:
    """
    解析 README.md 技术栈表格，返回每行结构化数据。

    表格格式（两列，目录名藏在注释里）：
        | 技术领域 <!-- dir:xxx --> | 内容 |

    返回：[{"domain": str, "dirs": list[str], "content": str}, ...]
    """
    readme_path = os.path.join(BASE, "README.md")
    with open(readme_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # 定位表头行（跳过表头 + 分隔线，共 +2）
    table_start = next(
        (i + 2 for i, line in enumerate(lines)
         if "| 技术领域 |" in line and "| 内容 |" in line),
        -1,
    )
    if table_start == -1:
        return []

    rows = []
    for line in lines[table_start:]:
        stripped = line.strip()
        # 遇到空行、标题行或非表格行时停止
        if not stripped or not stripped.startswith("|") or stripped.startswith("|---"):
            break
        parts = [p.strip() for p in stripped.split("|")[1:-1]]
        if len(parts) < 2:
            continue

        domain_cell, content = parts[0], parts[1]

        # 提取目录名（支持逗号分隔多目录）
        m = _DIR_COMMENT.search(domain_cell)
        dirs = [d.strip() for d in m.group(1).split(",") if d.strip()] if m else []

        # 清理 domain：去掉注释、链接语法、加粗符号
        domain = re.sub(r"<!--.*?-->", "", domain_cell)
        domain = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", domain)
        domain = domain.replace("**", "").strip()

        rows.append({"domain": domain, "dirs": dirs, "content": content})
    return rows


# 技术领域 → 目录列表，模块加载时解析一次
TECH_TO_CHAPTERS: dict[str, list[str]] = {
    row["domain"]: row["dirs"] for row in _parse_readme_rows()
}

# index.md 模板文件路径（用户可在此文件中自由编辑静态内容）
TEMPLATE_PATH = os.path.join(BASE, "tools", "index_template.md")

# 文档 ID 注册表路径（JSON 格式，记录 id → 相对路径的映射）
ID_REGISTRY_PATH = os.path.join(BASE, "tools", "doc_id_registry.json")

# 技术领域 → emoji 图标映射
DOMAIN_ICONS: dict[str, str] = {
    "环境搭建": "🛠️",
    "Java": "☕",
    "Spring": "🌱",
    "MySQL": "🐬",
    "PostgreSQL": "🐘",
    "Redis": "⚡",
    "Kafka": "📨",
    "Elasticsearch": "🔍",
    "设计模式": "🧩",
    "软件工程": "📐",
}

# ── 工具函数 ──────────────────────────────────────────────────────────────────


# 目录名 → 显示标题，直接从 README 表格的 domain 字段反查（模块加载时构建一次）
_DIR_TO_TITLE: dict[str, str] = {
    d: row["domain"]
    for row in _parse_readme_rows()
    for d in row["dirs"]
}


def get_chapter_title(dir_name: str) -> str:
    """从目录名获取可读标题，优先使用 README 表格中的 domain 名称。"""
    if dir_name in _DIR_TO_TITLE:
        return _DIR_TO_TITLE[dir_name]
    # 兜底：去掉数字前缀后转 Title Case
    parts = dir_name.split("-", 1)
    return parts[1].replace("-", " ").title() if len(parts) > 1 else dir_name


def get_article_title(file_path: str) -> str:
    """
    读取文章标题，优先级：
      1. frontmatter 中的 title 字段
      2. 正文第一个 # 标题
      3. 文件名（去掉数字前缀和扩展名）
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        if content.startswith("---"):
            for line in content.split("\n")[1:]:
                if line.strip() == "---":
                    break
                if line.strip().startswith("title:"):
                    return line.split(":", 1)[1].strip()

        for line in content.split("\n"):
            if line.strip().startswith("# "):
                return line.strip()[2:].strip()
    except Exception:
        pass

    name = os.path.splitext(os.path.basename(file_path))[0]
    return re.sub(r"^\d+-?", "", name)


# ── 核心逻辑 ──────────────────────────────────────────────────────────────────


def get_subdir_title(subdir_name: str) -> str:
    """从子目录名获取可读标题，去掉数字前缀后返回。"""
    parts = subdir_name.split("-", 1)
    return parts[1] if len(parts) > 1 else subdir_name


def collect_articles() -> tuple[list[dict], list[dict]]:
    """
    扫描 DOCS_DIR，按目录名排序，目录内按文件名排序。
    支持章节目录下的子目录（二级分组）。

    返回：
        articles  — 所有文章的列表，每项含 dir / file / title / path / subdir(可选)
        chapters  — 章节元数据列表，每项含 dir / files / subdirs
    """
    chapters = []
    for entry in sorted(os.listdir(DOCS_DIR)):
        full = os.path.join(DOCS_DIR, entry)
        if not (os.path.isdir(full) and CHAPTER_PATTERN.match(entry)):
            continue
        if entry in EXCLUDE_DIRS:
            print(f"  [排除目录] {entry}")
            continue

        # 收集章节根目录下的 .md 文件
        md_files = sorted(
            f for f in os.listdir(full)
            if f.endswith(".md") and os.path.isfile(os.path.join(full, f))
            and f"{entry}/{f}" not in EXCLUDE_FILES
        )

        # 收集子目录（二级分组）
        subdirs = []
        for sub_entry in sorted(os.listdir(full)):
            sub_full = os.path.join(full, sub_entry)
            if not os.path.isdir(sub_full):
                continue
            sub_md_files = sorted(
                f for f in os.listdir(sub_full)
                if f.endswith(".md") and os.path.isfile(os.path.join(sub_full, f))
                and f"{entry}/{sub_entry}/{f}" not in EXCLUDE_FILES
            )
            if sub_md_files:
                subdirs.append({"name": sub_entry, "files": sub_md_files})
                print(f"    [子目录] {entry}/{sub_entry}: {len(sub_md_files)} 篇")

        if md_files or subdirs:
            chapters.append({"dir": entry, "files": md_files, "subdirs": subdirs})
            sub_total = sum(len(s["files"]) for s in subdirs)
            print(f"  [章节] {entry}: 根目录 {len(md_files)} 篇，子目录 {sub_total} 篇")

    # 构建文章列表（包含根目录文件和子目录文件）
    articles = []
    for ch in chapters:
        for fname in ch["files"]:
            articles.append({
                "dir": ch["dir"],
                "file": fname,
                "title": get_article_title(os.path.join(DOCS_DIR, ch["dir"], fname)),
                "path": os.path.join(DOCS_DIR, ch["dir"], fname),
            })
        for sub in ch.get("subdirs", []):
            for fname in sub["files"]:
                articles.append({
                    "dir": ch["dir"],
                    "subdir": sub["name"],
                    "file": fname,
                    "title": get_article_title(
                        os.path.join(DOCS_DIR, ch["dir"], sub["name"], fname)
                    ),
                    "path": os.path.join(DOCS_DIR, ch["dir"], sub["name"], fname),
                })
    return articles, chapters

# ── nav 数字前缀提取 ─────────────────────────────────────────────────────────

# 匹配文件名或目录名开头的数字前缀，如 "01-"、"01a-"
_NUM_PREFIX = re.compile(r"^(\d+)[a-z]?-")


def _nav_sort_key(path_str: str) -> tuple:
    """
    从 nav 条目的路径字符串中提取排序键。
    路径格式："dir/file.md" 或 "dir/subdir/file.md"
    取最后一段（文件名或子目录名）的数字前缀作为排序依据。
    有数字前缀 → (0, 数字值)；无前缀 → (1, 0)（排到有前缀的后面）
    """
    last_seg = path_str.rstrip("/").rsplit("/", 1)[-1]
    m = _NUM_PREFIX.match(last_seg)
    if m:
        return (0, int(m.group(1)))
    return (1, 0)


def _insert_into_section(section: list, new_entry: dict, new_path: str) -> None:
    """
    将 new_entry（{title: path}）按数字前缀规则插入 section 列表。

    规则：
      - 有数字前缀：找到第一个数字前缀 > 新条目前缀的位置插入；
        若存在相同前缀的条目，则插到同前缀最后一个的后面。
      - 无数字前缀：追加到列表末尾（跳过子目录分组条目）。
    """
    new_key = _nav_sort_key(new_path)

    if new_key[0] == 1:
        # 无数字前缀：追加到末尾
        section.append(new_entry)
        return

    new_num = new_key[1]
    insert_pos = len(section)  # 默认追加到末尾

    for i, item in enumerate(section):
        # 跳过子目录分组（值为 list 的条目）
        item_path = next(iter(item.values()))
        if isinstance(item_path, list):
            continue
        item_num_key = _nav_sort_key(item_path)
        if item_num_key[0] == 0:
            if item_num_key[1] == new_num:
                # 相同前缀：更新插入位置到该条目之后，继续遍历
                insert_pos = i + 1
            elif item_num_key[1] > new_num:
                # 找到第一个比新条目数字大的位置，停止
                insert_pos = i
                break

    section.insert(insert_pos, new_entry)


def _merge_nav_section(
    existing_section: list,
    ch_dir: str,
    ch_files: list[str],
    ch_subdirs: list[dict],
    articles: list[dict],
) -> tuple[list, int]:
    """
    将文件系统中的文章合并进已有的 section，只插入新增条目，保留已有顺序。

    返回：(merged_section, added_count)
    """
    section = list(existing_section)  # 浅拷贝，避免修改原列表
    added = 0

    # 收集已有条目的路径集合（用于判断是否已存在）
    def _existing_paths(sec: list) -> set[str]:
        paths = set()
        for item in sec:
            v = next(iter(item.values()))
            if isinstance(v, str):
                paths.add(v)
            elif isinstance(v, list):
                paths |= _existing_paths(v)
        return paths

    existing_paths = _existing_paths(section)

    # ── 处理章节根目录下的文件 ────────────────────────────────────────────────
    for fname in ch_files:
        nav_path = f"{ch_dir}/{fname}"
        if nav_path in existing_paths:
            continue  # 已存在，跳过
        art = next(
            (a for a in articles
             if a["dir"] == ch_dir and a.get("subdir") is None and a["file"] == fname),
            None,
        )
        if art:
            _insert_into_section(section, {art["title"]: nav_path}, nav_path)
            existing_paths.add(nav_path)
            added += 1
            print(f"  [新增] nav 条目: {nav_path}")

    # ── 处理子目录分组 ────────────────────────────────────────────────────────
    for sub in ch_subdirs:
        sub_name = sub["name"]
        sub_title = get_subdir_title(sub_name)

        # 在 section 中找到对应的子目录分组条目
        sub_entry_idx = next(
            (i for i, item in enumerate(section)
             if next(iter(item.keys())) == sub_title
             and isinstance(next(iter(item.values())), list)),
            None,
        )

        if sub_entry_idx is None:
            # 子目录分组不存在，整体新建
            sub_section = []
            for fname in sub["files"]:
                nav_path = f"{ch_dir}/{sub_name}/{fname}"
                art = next(
                    (a for a in articles
                     if a["dir"] == ch_dir and a.get("subdir") == sub_name
                     and a["file"] == fname),
                    None,
                )
                if art:
                    sub_section.append({art["title"]: nav_path})
                    added += 1
                    print(f"  [新增] nav 条目: {nav_path}")
            if sub_section:
                new_sub_entry = {sub_title: sub_section}
                # 子目录分组按自身目录名的数字前缀插入
                _insert_into_section(section, new_sub_entry, sub_name)
        else:
            # 子目录分组已存在，递归合并其内部条目
            existing_sub = list(section[sub_entry_idx][sub_title])
            existing_sub_paths = _existing_paths(existing_sub)
            for fname in sub["files"]:
                nav_path = f"{ch_dir}/{sub_name}/{fname}"
                if nav_path in existing_sub_paths:
                    continue
                art = next(
                    (a for a in articles
                     if a["dir"] == ch_dir and a.get("subdir") == sub_name
                     and a["file"] == fname),
                    None,
                )
                if art:
                    _insert_into_section(existing_sub, {art["title"]: nav_path}, nav_path)
                    existing_sub_paths.add(nav_path)
                    added += 1
                    print(f"  [新增] nav 条目: {nav_path}")
            section[sub_entry_idx] = {sub_title: existing_sub}

    return section, added


def prune_nav(nav: list, check_only: bool = False) -> tuple[list, int]:
    """
    清理 nav 中所有指向不存在文件的条目。

    规则：
      - 叶子条目（值为字符串路径）：若对应文件在 DOCS_DIR 下不存在则删除
      - 分组条目（值为列表）：递归清理，若清理后子列表为空则删除整个分组
      - Home 条目（index.md）始终保留

    返回：(pruned_nav, removed_count)
    """
    removed = 0

    def _prune(section: list) -> list:
        nonlocal removed
        result = []
        for item in section:
            title = next(iter(item.keys()))
            value = next(iter(item.values()))

            if isinstance(value, list):
                # 分组条目：递归清理
                pruned_sub = _prune(value)
                if pruned_sub:
                    result.append({title: pruned_sub})
                else:
                    removed += 1
                    print(f"  [清理] nav 空分组: {title}")
            else:
                # 叶子条目：检查文件是否存在
                if value == "index.md":
                    result.append(item)
                    continue
                file_path = os.path.join(DOCS_DIR, value)
                if os.path.isfile(file_path):
                    result.append(item)
                else:
                    removed += 1
                    if check_only:
                        print(f"  [需清理] nav 条目: {value}")
                    else:
                        print(f"  [清理] nav 条目: {value}")
        return result

    pruned = _prune(nav)
    return pruned, removed


def merge_mkdocs_nav(existing_nav: list, articles: list[dict], chapters: list[dict]) -> list:
    """
    将文件系统中的文章增量合并进已有的 nav，保留已有条目的顺序。

    规则：
      - 已有条目：保持原位不动
      - 新增文章：有数字前缀 → 按数字顺序插入；无前缀 → 追加到对应层级末尾
      - 新增章节（顶层目录）：按章节目录名的数字前缀插入到顶层 nav
    """
    nav = list(existing_nav)  # 浅拷贝

    # 确保首项是 Home
    if not nav or next(iter(nav[0].keys())) != "Home":
        nav.insert(0, {"Home": "index.md"})

    for ch in chapters:
        ch_dir = ch["dir"]
        ch_title = get_chapter_title(ch_dir)

        # 在已有 nav 中查找该章节
        ch_entry_idx = next(
            (i for i, item in enumerate(nav)
             if next(iter(item.keys())) == ch_title
             and isinstance(next(iter(item.values())), list)),
            None,
        )

        if ch_entry_idx is None:
            # 章节不存在，整体新建后按数字前缀插入顶层 nav
            section: list = []
            for fname in ch["files"]:
                art = next(
                    (a for a in articles
                     if a["dir"] == ch_dir and a.get("subdir") is None
                     and a["file"] == fname),
                    None,
                )
                if art:
                    section.append({art["title"]: f"{ch_dir}/{fname}"})
            for sub in ch.get("subdirs", []):
                sub_section = []
                for fname in sub["files"]:
                    art = next(
                        (a for a in articles
                         if a["dir"] == ch_dir and a.get("subdir") == sub["name"]
                         and a["file"] == fname),
                        None,
                    )
                    if art:
                        sub_section.append(
                            {art["title"]: f"{ch_dir}/{sub['name']}/{fname}"}
                        )
                if sub_section:
                    new_sub_entry = {get_subdir_title(sub["name"]): sub_section}
                    _insert_into_section(section, new_sub_entry, sub["name"])
            if section:
                new_ch_entry = {ch_title: section}
                _insert_into_section(nav, new_ch_entry, ch_dir)
                print(f"  [新增] nav 章节: {ch_title}")
        else:
            # 章节已存在，增量合并内部条目
            existing_section = list(nav[ch_entry_idx][ch_title])
            merged, added = _merge_nav_section(
                existing_section, ch_dir, ch["files"], ch.get("subdirs", []), articles
            )
            nav[ch_entry_idx] = {ch_title: merged}

    return nav


def update_mkdocs_yml(articles: list[dict], chapters: list[dict], check_only: bool = False) -> bool:
    """
    增量更新 mkdocs.yml 的 nav 部分：读取现有 nav，合并新增文章，保留已有顺序。
    """
    mkdocs_path = os.path.join(BASE, "mkdocs.yml")
    with open(mkdocs_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 只提取 nav: 部分进行解析，避免 mkdocs.yml 中 !ENV / !!python 等自定义标签干扰
    nav_match = re.search(r"\bnav:\n(.*)", content, re.DOTALL)
    if nav_match:
        nav_yaml_str = "nav:\n" + nav_match.group(1)
        existing_config = yaml.safe_load(nav_yaml_str)
    else:
        existing_config = {}
    existing_nav: list = existing_config.get("nav") or [{"Home": "index.md"}]

    # 清理不存在的文件条目（文件删除或重命名后移除旧条目）
    print("  → 检查失效条目...")
    existing_nav, removed = prune_nav(existing_nav, check_only)
    if removed:
        print(f"  [清理] 共移除 {removed} 个失效 nav 条目")
    else:
        print("  → 无失效条目")

    # 增量合并
    print("  → 合并新增条目...")
    new_nav = merge_mkdocs_nav(existing_nav, articles, chapters)

    nav_yaml = yaml.dump(new_nav, default_flow_style=False, allow_unicode=True, indent=2)
    # 只去掉不含 YAML 特殊字符的单引号对；含 [ ] : # & * ? | > ! % @ ` 的值必须保留引号
    nav_yaml = re.sub(r"'([^']*)'", lambda m: m.group(1) if not re.search(r'[\[\]:&#*?|>!%@`]', m.group(1)) else f'"{m.group(1)}"', nav_yaml).rstrip("\n")

    # 将 nav: 之后的所有内容替换为新的 nav_yaml，末尾统一保留一个换行
    new_content = re.sub(
        r"(nav:\n).*",
        r"\g<1>" + nav_yaml,
        content,
        flags=re.DOTALL,
    ).rstrip("\n") + "\n"

    if new_content == content:
        print("  → mkdocs.yml nav 无变化，跳过写入")
        return False

    if not check_only:
        with open(mkdocs_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("  [更新] mkdocs.yml nav 已写入")
    else:
        print("  [需更新] mkdocs.yml")
    return True


def add_frontmatter(file_path: str, expected_title: str, check_only: bool = False) -> bool:
    """
    确保文件拥有正确的 frontmatter title，返回是否发生变更。

    处理三种情况：
      1. 无 frontmatter       → 在文件头插入完整 frontmatter
      2. 有 frontmatter 无 title → 在 frontmatter 第一行后插入 title
      3. 有 frontmatter 有 title → 若与期望不符则更新
    """
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # ── 情况 1：无 frontmatter ────────────────────────────────────────────────
    if not content.startswith("---"):
        if check_only:
            print(f"  [需更新] {file_path} (缺少 frontmatter)")
            return True
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(f"---\ntitle: {expected_title}\n---\n\n{content}")
        print(f"  [添加 frontmatter] {file_path}  title={expected_title!r}")
        return True

    # 解析现有 frontmatter
    lines = content.split("\n")
    existing_title: str | None = None
    fm_end = -1
    for i, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            fm_end = i
            break
        if line.strip().startswith("title:"):
            existing_title = line.split(":", 1)[1].strip()

    # ── 情况 2：有 frontmatter 但缺少 title ──────────────────────────────────
    if existing_title is None:
        if check_only:
            print(f"  [需更新] {file_path} (frontmatter 缺少 title)")
            return True
        lines.insert(1, f"title: {expected_title}")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        print(f"  [添加 title] {file_path}  title={expected_title!r}")
        return True

    # ── 情况 3：title 已存在 ──────────────────────────────────────────────────
    if existing_title == expected_title:
        return False  # 无需修改

    if check_only:
        print(f"  [需更新] {file_path} (frontmatter title 不一致: {existing_title!r} → {expected_title!r})")
        return True

    new_lines = [
        f"title: {expected_title}" if line.strip().startswith("title:") else line
        for line in lines
    ]
    with open(file_path, "w", encoding="utf-8") as f:
        f.write("\n".join(new_lines))
    print(f"  [更新 title] {file_path}  {existing_title!r} → {expected_title!r}")
    return True


# ── 文档 ID 管理 ─────────────────────────────────────────────────────────────

# 目录名 → ID 前缀映射（简短、有意义的英文缩写）
_DIR_TO_PREFIX: dict[str, str] = {
    "00-Env": "env",
    "01-java-basic": "java",
    "02-spring": "spring",
    "03-mysql": "mysql",
    "04-postgresql": "pg",
    "05-redis": "redis",
    "06-kafka": "kafka",
    "07-elasticsearch": "es",
    "08-design-pattern": "dp",
    "09-software-engineering": "se",
}


def _generate_doc_id(dir_name: str, file_name: str, subdir_name: str | None = None) -> str:
    """
    根据目录名和文件名生成稳定的文档 ID。

    规则：
      - 前缀取自 _DIR_TO_PREFIX（兜底用目录名去掉数字前缀）
      - 文件名去掉数字前缀和 .md 后缀，转小写，特殊字符替换为连字符
      - 子目录名（如有）也会纳入 ID

    示例：
      01-java-basic/03-并发编程.md → java-并发编程
      02-spring/01-核心基础/05-AOP面向切面编程.md → spring-核心基础-aop面向切面编程
    """
    # 前缀
    prefix = _DIR_TO_PREFIX.get(dir_name, "")
    if not prefix:
        parts = dir_name.split("-", 1)
        prefix = parts[1].lower() if len(parts) > 1 else dir_name.lower()

    # 文件名部分：去掉数字前缀和扩展名
    base = os.path.splitext(file_name)[0]
    base = re.sub(r"^\d+[a-z]?-?", "", base)  # 去掉 "00-"、"01a-" 等前缀

    # 子目录部分
    sub = ""
    if subdir_name:
        sub = re.sub(r"^\d+-?", "", subdir_name)

    # 清理特殊字符：移除 []（）() 等会干扰 Markdown 链接语法的字符
    base = re.sub(r"[\[\]()（）]", "", base)
    sub = re.sub(r"[\[\]()（）]", "", sub)

    # 组合 ID：prefix-sub-base（去掉空段）
    segments = [prefix]
    if sub:
        segments.append(sub)
    if base:
        segments.append(base)

    doc_id = "-".join(segments)
    # 最终清理：连续连字符合并
    doc_id = re.sub(r"-+", "-", doc_id).strip("-")
    return doc_id


def _load_id_registry() -> dict[str, str]:
    """加载已有的 ID 注册表（id → 相对路径）。"""
    if os.path.exists(ID_REGISTRY_PATH):
        with open(ID_REGISTRY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_id_registry(registry: dict[str, str]) -> None:
    """保存 ID 注册表到 JSON 文件。"""
    with open(ID_REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(registry, f, ensure_ascii=False, indent=2, sort_keys=True)


def build_id_registry(articles: list[dict], check_only: bool = False) -> bool:
    """
    为所有文章生成文档 ID，写入 frontmatter 并更新注册表。

    - 如果文章 frontmatter 中已有 doc_id，优先使用已有的（保证稳定性）
    - 如果没有，则自动生成并写入
    - 检测 ID 冲突并报错

    返回：是否有变更
    """
    registry: dict[str, str] = {}  # id → 相对路径（相对于 docs/）
    changed = False

    for art in articles:
        file_path = art["path"]
        dir_name = art["dir"]
        file_name = art["file"]
        subdir_name = art.get("subdir")

        # 计算相对于 docs/ 的路径
        if subdir_name:
            rel_path = f"{dir_name}/{subdir_name}/{file_name}"
        else:
            rel_path = f"{dir_name}/{file_name}"

        # 读取文件，检查是否已有 doc_id
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        existing_id = None
        if content.startswith("---"):
            for line in content.split("\n")[1:]:
                if line.strip() == "---":
                    break
                if line.strip().startswith("doc_id:"):
                    existing_id = line.split(":", 1)[1].strip()
                    break

        if existing_id:
            doc_id = existing_id
            print(f"  [复用 doc_id] {rel_path}  id={doc_id!r}")
        else:
            doc_id = _generate_doc_id(dir_name, file_name, subdir_name)
            print(f"  [生成 doc_id] {rel_path}  id={doc_id!r}")

        # 检测 ID 冲突
        if doc_id in registry:
            print(f"  ⚠️  ID 冲突: '{doc_id}' 同时匹配 {registry[doc_id]} 和 {rel_path}")
            # 追加数字后缀解决冲突
            suffix = 2
            while f"{doc_id}-{suffix}" in registry:
                suffix += 1
            doc_id = f"{doc_id}-{suffix}"
            print(f"       → 自动重命名为 '{doc_id}'")

        registry[doc_id] = rel_path

        # 如果 frontmatter 中没有 doc_id，写入
        if not existing_id:
            if check_only:
                print(f"  [需写入] {rel_path}  缺少 doc_id，将写入 {doc_id!r}")
                changed = True
                continue

            if content.startswith("---"):
                # 在 frontmatter 中插入 doc_id（紧跟在 --- 之后）
                lines = content.split("\n")
                lines.insert(1, f"doc_id: {doc_id}")
                content = "\n".join(lines)
            else:
                # 没有 frontmatter，创建一个
                content = f"---\ndoc_id: {doc_id}\n---\n\n{content}"

            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"  [写入 doc_id] {rel_path}  id={doc_id!r}")
            changed = True

    # 保存注册表
    old_registry = _load_id_registry()
    # 计算新增/删除/修改的条目
    added_ids   = set(registry) - set(old_registry)
    removed_ids = set(old_registry) - set(registry)
    changed_ids = {k for k in registry if k in old_registry and registry[k] != old_registry[k]}
    if registry != old_registry:
        print(f"  [注册表变更] 新增 {len(added_ids)} 条，删除 {len(removed_ids)} 条，路径变更 {len(changed_ids)} 条")
        for k in sorted(added_ids):
            print(f"    + {k}: {registry[k]}")
        for k in sorted(removed_ids):
            print(f"    - {k}: {old_registry[k]}")
        for k in sorted(changed_ids):
            print(f"    ~ {k}: {old_registry[k]} → {registry[k]}")
        if not check_only:
            _save_id_registry(registry)
            print(f"  [更新] doc_id_registry.json ({len(registry)} 条记录)")
        else:
            print(f"  [需更新] doc_id_registry.json")
        changed = True
    else:
        print(f"  → doc_id_registry.json 无变化（共 {len(registry)} 条记录）")

    return changed


# ── 入口 ──────────────────────────────────────────────────────────────────────


def main() -> None:
    import time
    check_only = "--check" in sys.argv
    mode_label = "[CHECK 模式，不写入文件]" if check_only else "[写入模式]"
    print(f"{'='*60}")
    print(f"gen_nav.py  {mode_label}")
    print(f"{'='*60}")

    t0 = time.time()

    print("\n🔍 扫描文章...")
    articles, chapters = collect_articles()
    print(f"   ✔ 共发现 {len(articles)} 篇文章，{len(chapters)} 个章节")

    print("\n🔧 更新 mkdocs.yml nav...")
    nav_changed = update_mkdocs_yml(articles, chapters, check_only)
    print(f"   ✔ nav {'有变更' if nav_changed else '无变更'}")

    print("\n📝 处理 frontmatter title...")
    fm_changed = 0
    fm_skipped = 0
    for article in articles:
        if add_frontmatter(article["path"], article["title"], check_only):
            fm_changed += 1
        else:
            fm_skipped += 1
    print(f"   ✔ 变更 {fm_changed} 篇，跳过 {fm_skipped} 篇")

    print("\n🆔 生成文档 ID...")
    id_changed = build_id_registry(articles, check_only)
    print(f"   ✔ doc_id {'有变更' if id_changed else '无变更'}")

    elapsed = time.time() - t0
    print(f"\n{'='*60}")
    print(f"✅ 完成！耗时 {elapsed:.2f}s")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
