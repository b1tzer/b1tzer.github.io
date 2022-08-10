#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_nav.py — 将项目 Markdown 文章同步到 docs/ 目录，并自动更新 mkdocs.yml 的 nav 配置

用法：
python3 tools/gen_nav.py          # 在项目根目录执行
python3 tools/gen_nav.py --check  # 仅检查，不写入（CI 用）

规则：
    - 章节目录：以 数字- 开头的一级子目录（如 01-java-basic）
    - 文章顺序：按文件名字典序排序（文件名前缀数字保证顺序）
    - 将 Markdown 文件复制到 docs/<章节目录>/ 下
    - 自动更新 mkdocs.yml 中的 nav 配置
"""

import os
import re
import sys
import shutil
import yaml

# ── 配置 ──────────────────────────────────────────────────────────────────────

# 项目根目录（脚本相对位置：tools/gen_nav.py）
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# docs 目录
DOCS_DIR = os.path.join(BASE, "docs")

# mkdocs.yml 路径
MKDOCS_YML = os.path.join(BASE, "mkdocs.yml")

# 章节目录匹配规则（以数字开头的一级目录）
CHAPTER_PATTERN = re.compile(r"^\d+-.+$")

# ── 排除配置 ──────────────────────────────────────────────────────────────────
# 排除整个章节目录（填写目录名，如 "10-project-experience"）
EXCLUDE_DIRS: list[str] = [
    "10-project-experience"
]

# 排除具体文章（填写 "目录名/文件名"，如 "01-java-basic/07-[Java8]Lambda表达式.md"）
EXCLUDE_FILES: list[str] = [
    # "01-java-basic/07-[Java8]Lambda表达式.md",
]

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
    "10": "💼",
}
DEFAULT_EMOJI = "📄"

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
                stripped = line.strip()
                if stripped.startswith("# "):
                    return stripped[2:].strip()
    except Exception:
        pass
    # fallback：去掉数字前缀和扩展名
    name = os.path.splitext(os.path.basename(file_path))[0]
    name = re.sub(r"^\d+-?", "", name)
    return name


# ── 核心逻辑 ──────────────────────────────────────────────────────────────────

def collect_articles():
    """
    扫描项目目录，按章节目录名排序，章节内按文件名排序，
    返回有序的文章列表和章节元数据。
    """
    chapters = []
    for entry in sorted(os.listdir(BASE)):
        full = os.path.join(BASE, entry)
        if os.path.isdir(full) and CHAPTER_PATTERN.match(entry):
            # 排除整个目录
            if entry in EXCLUDE_DIRS:
                print(f"  [排除目录] {entry}")
                continue
            md_files = sorted(
                f for f in os.listdir(full)
                if f.endswith(".md") and f"{entry}/{f}" not in EXCLUDE_FILES
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


def sync_docs(articles: list, chapters_meta: list, check_only: bool = False) -> int:
    """将 Markdown 文件同步到 docs/ 目录，返回变更文件数"""
    changed = 0

    # 确保 docs 目录存在
    if not check_only:
        os.makedirs(DOCS_DIR, exist_ok=True)

    # 同步每个章节目录
    for ch in chapters_meta:
        ch_dir = ch["dir"]
        dest_dir = os.path.join(DOCS_DIR, ch_dir)
        if not check_only:
            os.makedirs(dest_dir, exist_ok=True)

        for fname in ch["files"]:
            src = os.path.join(BASE, ch_dir, fname)
            dst = os.path.join(dest_dir, fname)

            # 读取源文件内容
            with open(src, "r", encoding="utf-8") as f:
                content = f.read()

            # 将旧的 ../README.md 链接替换为 MkDocs 的 ../index.md
            content = content.replace("../README.md", "../index.md")

            # 检查目标文件是否需要更新
            if os.path.exists(dst):
                with open(dst, "r", encoding="utf-8") as f:
                    old_content = f.read()
                if old_content == content:
                    continue

            changed += 1
            if not check_only:
                with open(dst, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"  [同步] {ch_dir}/{fname}")
            else:
                print(f"  [需同步] {ch_dir}/{fname}")

    # 同步自定义首页
    # 同步自定义首页 homepage.md → docs/index.md
    homepage_src = os.path.join(BASE, "homepage.md")
    homepage_dst = os.path.join(DOCS_DIR, "index.md")
    if os.path.exists(homepage_src):
        with open(homepage_src, "r", encoding="utf-8") as f:
            homepage_content = f.read()
        if not os.path.exists(homepage_dst) or open(homepage_dst).read() != homepage_content:
            changed += 1
            if not check_only:
                with open(homepage_dst, "w", encoding="utf-8") as f:
                    f.write(homepage_content)
                print(f"  [同步] homepage.md → docs/index.md")

    return changed


def update_mkdocs_nav(articles: list, chapters_meta: list, check_only: bool = False) -> bool:
    """更新 mkdocs.yml 中的 nav 配置"""

    # 读取现有 mkdocs.yml（保留注释用原始文本处理）
    with open(MKDOCS_YML, "r", encoding="utf-8") as f:
        content = f.read()

    # 构建 nav 结构
    nav = [{"首页": "index.md"}]

    chapter_articles = {}
    for art in articles:
        chapter_articles.setdefault(art["dir"], []).append(art)

    for ch_dir in sorted(chapter_articles.keys()):
        arts = chapter_articles[ch_dir]
        ch_title = get_chapter_title(ch_dir)
        section_title = ch_title

        section_items = []
        for art in arts:
            doc_path = f"{ch_dir}/{art['file']}"
            section_items.append({art["title"]: doc_path})

        nav.append({section_title: section_items})

    # 生成 nav YAML 文本
    nav_yaml = yaml.dump({"nav": nav}, allow_unicode=True, default_flow_style=False, sort_keys=False)
    nav_text = nav_yaml  # 只取 nav 部分

    # 用正则替换 mkdocs.yml 中的 nav 块（从 "nav:" 到文件末尾或下一个顶级 key）
    nav_pattern = re.compile(r'^nav:.*?(?=^\w|\Z)', re.MULTILINE | re.DOTALL)

    if nav_pattern.search(content):
        new_content = nav_pattern.sub(nav_text, content)
    else:
        # 如果没有 nav 块，追加到末尾
        new_content = content.rstrip() + "\n\n" + nav_text

    if new_content == content:
        return False

    if not check_only:
        with open(MKDOCS_YML, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"  [更新] mkdocs.yml nav 配置")
    else:
        print(f"  [需更新] mkdocs.yml nav 配置")
    return True


def update_readme(articles: list, chapters_meta: list, check_only: bool = False) -> bool:
    """重新生成 README.md 的目录部分"""
    readme_path = os.path.join(BASE, "README.md")

    # 构建目录内容
    toc_lines = []
    chapter_articles = {}
    for art in articles:
        chapter_articles.setdefault(art["dir"], []).append(art)

    for ch_dir in sorted(chapter_articles.keys()):
        arts = chapter_articles[ch_dir]
        ch_title = get_chapter_title(ch_dir)
        toc_lines.append(f"\n### {ch_title}\n")
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
        tree_lines.append(f"├── {ch_dir:<35} （{count} 篇）")
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

> 共 **{total} 篇**文章，持续更新中。
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

    print("📁 同步文章到 docs/ 目录...")
    sync_changed = sync_docs(articles, chapters_meta, check_only)

    print("\n🧭 更新 mkdocs.yml 导航...")
    nav_changed = update_mkdocs_nav(articles, chapters_meta, check_only)

    print("\n📖 更新 README 目录...")
    readme_changed = update_readme(articles, chapters_meta, check_only)

    print()
    if check_only:
        if sync_changed > 0 or nav_changed or readme_changed:
            print(f"❌ 有内容需要更新，请先运行 python3 tools/gen_nav.py")
            sys.exit(1)
        else:
            print("✅ 所有内容均为最新，无需更新")
    else:
        if sync_changed == 0 and not nav_changed and not readme_changed:
            print("✅ 所有内容均为最新，无需更新")
        else:
            print(f"✅ 完成！同步了 {sync_changed} 个文件" +
                  ("，更新了 mkdocs.yml 导航" if nav_changed else "") +
                  ("，更新了 README" if readme_changed else ""))


if __name__ == "__main__":
    main()
