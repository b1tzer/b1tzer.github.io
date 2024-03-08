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

        if md_files or subdirs:
            chapters.append({"dir": entry, "files": md_files, "subdirs": subdirs})

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


def generate_index_md(articles: list[dict], check_only: bool = False) -> bool:
    """
    生成 docs/index.md。

    读取 tools/index_template.md，将其中的 {{TECH_TABLE}} 占位符替换为
    根据文章列表动态生成的技术栈表格。
    """
    index_path = os.path.join(DOCS_DIR, "index.md")

    # 读取模板
    with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
        template = f.read()

    # 预建索引：目录名 → 文档数量 / 第一篇文章路径
    dir_count: dict[str, int] = {}
    dir_first: dict[str, str] = {}
    for art in articles:
        d = art["dir"]
        dir_count[d] = dir_count.get(d, 0) + 1
        if d not in dir_first:
            if "subdir" in art:
                dir_first[d] = f"{d}/{art['subdir']}/{art['file']}"
            else:
                dir_first[d] = f"{d}/{art['file']}"

    # 构建技术栈表格
    rows = ["| 技术领域 | 内容 | 文档数量 |", "|---------|------|--------|"]
    for row in _parse_readme_rows():
        domain, content = row["domain"], row["content"]
        total = sum(dir_count.get(d, 0) for d in row["dirs"])
        first = next((dir_first[d] for d in row["dirs"] if d in dir_first), "")
        link = f"[{domain}]({first})" if first else domain
        rows.append(f"| {link} | {content} | {total} 篇 |")

    # 替换占位符
    index_content = template.replace("{{TECH_TABLE}}", "\n".join(rows))

    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            if f.read() == index_content:
                return False

    if not check_only:
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(index_content)
        print("  [更新] docs/index.md")
    else:
        print("  [需更新] docs/index.md")
    return True


def generate_mkdocs_nav(articles: list[dict], chapters: list[dict]) -> list:
    """根据文章列表和章节结构生成 MkDocs nav 结构，支持子目录二级分组。"""
    nav: list = [{"Home": "index.md"}]

    for ch in chapters:
        ch_dir = ch["dir"]
        section: list = []

        # 添加章节根目录下的文件
        for fname in ch["files"]:
            art = next(
                (a for a in articles
                 if a["dir"] == ch_dir and a.get("subdir") is None and a["file"] == fname),
                None,
            )
            if art:
                section.append({art["title"]: f"{ch_dir}/{fname}"})

        # 添加子目录分组
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
                section.append({get_subdir_title(sub["name"]): sub_section})

        if section:
            nav.append({get_chapter_title(ch_dir): section})
    return nav


def update_mkdocs_yml(nav_data: list, check_only: bool = False) -> bool:
    """将 nav_data 写入 mkdocs.yml 的 nav 部分。"""
    mkdocs_path = os.path.join(BASE, "mkdocs.yml")
    with open(mkdocs_path, "r", encoding="utf-8") as f:
        content = f.read()

    nav_yaml = yaml.dump(nav_data, default_flow_style=False, allow_unicode=True, indent=2)
    nav_yaml = nav_yaml.replace("'", "").rstrip("\n")  # 移除 yaml.dump 产生的多余单引号和末尾换行

    # 将 nav: 之后的所有内容替换为新的 nav_yaml，末尾统一保留一个换行
    new_content = re.sub(
        r"(nav:\n).*",
        r"\g<1>" + nav_yaml,
        content,
        flags=re.DOTALL,
    ).rstrip("\n") + "\n"

    if new_content == content:
        return False

    if not check_only:
        with open(mkdocs_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("  [更新] mkdocs.yml")
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
        print(f"  [添加] {file_path} (frontmatter)")
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
        print(f"  [更新] {file_path} (添加 frontmatter title)")
        return True

    # ── 情况 3：title 已存在 ──────────────────────────────────────────────────
    if existing_title == expected_title:
        return False  # 无需修改

    if check_only:
        print(f"  [需更新] {file_path} (frontmatter title 不一致)")
        return True

    new_lines = [
        f"title: {expected_title}" if line.strip().startswith("title:") else line
        for line in lines
    ]
    with open(file_path, "w", encoding="utf-8") as f:
        f.write("\n".join(new_lines))
    print(f"  [更新] {file_path} (frontmatter title)")
    return True


# ── 入口 ──────────────────────────────────────────────────────────────────────


def main() -> None:
    check_only = "--check" in sys.argv

    print("🔍 扫描文章...")
    articles, chapters = collect_articles()
    print(f"   共发现 {len(articles)} 篇文章，{len(chapters)} 个章节")

    print("\n📄 生成 docs/index.md...")
    generate_index_md(articles, check_only)

    print("\n🔧 更新 mkdocs.yml nav...")
    update_mkdocs_yml(generate_mkdocs_nav(articles, chapters), check_only)

    print("\n📝 处理 frontmatter...")
    for article in articles:
        add_frontmatter(article["path"], article["title"], check_only)

    print("\n✅ 完成！")


if __name__ == "__main__":
    main()
