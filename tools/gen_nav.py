#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_nav.py — 更新 README（导航由 awesome-pages 插件自动生成）

用法：
python3 tools/gen_nav.py          # 在项目根目录执行
python3 tools/gen_nav.py --check  # 仅检查，不写入（CI 用）

功能：
    - 更新 README.md 的目录部分
    - 导航配置由 mkdocs-awesome-pages-plugin 自动生成
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

# 源内容目录
CONTENT_DIR = os.path.join(BASE, "docs")

# 章节目录匹配规则（以数字开头的一级目录）
CHAPTER_PATTERN = re.compile(r"^\d+-.+$")

# ── 排除配置 ──────────────────────────────────────────────────────────────────
# 排除整个章节目录（填写目录名，如 "10-project-experience"）
EXCLUDE_DIRS: list[str] = ["10-project-experience"]

# 排除具体文章（填写 "目录名/文件名"，如 "01-java-basic/07-[Java8]Lambda表达式.md"）
EXCLUDE_FILES: list[str] = [
    # "01-java-basic/07-[Java8]Lambda表达式.md",
]

# ── 技术领域映射 ──────────────────────────────────────────────────────────────────
# 技术领域到章节目录的映射
TECH_TO_CHAPTERS = {
    "开发工具": ["00-Env"],
    "Java 基础": ["01-java-basic"],
    "Spring 生态": ["02-spring"],
    "数据库": ["03-mysql", "04-postgresql"],
    "缓存": ["05-redis"],
    "消息队列": ["06-kafka"],
    "搜索引擎": ["07-elasticsearch"],
    "设计模式": ["08-design-pattern"],
    "软件工程": ["09-software-engineering"],
}

# ── 工具函数 ──────────────────────────────────────────────────────────────────


def parse_readme_table() -> list[dict]:
    """从README.md解析技术栈表格"""
    readme_path = os.path.join(BASE, "README.md")
    with open(readme_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # 找到技术栈表格
    lines = content.split("\n")
    table_start = -1
    for i, line in enumerate(lines):
        if "| 技术领域 | 内容 |" in line:
            table_start = i + 2  # 跳过表头和分隔线
            break
    
    if table_start == -1:
        return []
    
    table_data = []
    for line in lines[table_start:]:
        if not line.strip() or line.startswith("##"):
            break
        if "|" in line and not line.strip().startswith("|---"):
            parts = [p.strip() for p in line.split("|")[1:-1]]
            if len(parts) == 2:
                domain = parts[0].replace("**", "").strip()
                content = parts[1].strip()
                table_data.append({"domain": domain, "content": content})
    
    return table_data


def get_chapter_title(dir_name: str) -> str:
    """从目录名提取章节标题，如 01-java-basic → Java Basic"""
    parts = dir_name.split("-", 1)
    return parts[1].replace("-", " ").title() if len(parts) > 1 else dir_name


def get_article_title(file_path: str) -> str:
    """读取 md 文件的标题，优先从 frontmatter 中读取，其次读取第一个 # 标题，找不到则用文件名"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # 优先从 frontmatter 中读取 title
        if content.startswith("---"):
            lines = content.split("\n")
            for line in lines[1:]:
                if line.strip() == "---":
                    break
                if line.strip().startswith("title:"):
                    return line.split(":", 1)[1].strip()

        # 从第一个 # 标题读取
        for line in content.split("\n"):
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


def add_frontmatter(
    file_path: str, expected_title: str, check_only: bool = False
) -> bool:
    """
    为文件添加 frontmatter 部分，如果已有则检查是否一致
    返回是否有变更
    """
    # 读取文件内容
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 检查是否已经有 frontmatter
    if content.startswith("---"):
        # 提取现有 frontmatter 中的 title
        lines = content.split("\n")
        title_line = None
        for line in lines[1:]:
            if line.strip() == "---":
                break
            if line.strip().startswith("title:"):
                title_line = line.strip()
                break

        if title_line:
            # 解析现有 title
            existing_title = title_line.split(":", 1)[1].strip()
            if existing_title == expected_title:
                # title 一致，无需修改
                return False
            else:
                # title 不一致，需要更新
                if check_only:
                    print(f"  [需更新] {file_path} (frontmatter title 不一致)")
                    return True
                else:
                    # 更新 frontmatter 中的 title
                    new_lines = []
                    in_frontmatter = True
                    for line in lines:
                        if in_frontmatter:
                            if line.strip().startswith("title:"):
                                new_lines.append(f"title: {expected_title}")
                            else:
                                new_lines.append(line)
                            if line.strip() == "---" and len(new_lines) > 1:
                                in_frontmatter = False
                        else:
                            new_lines.append(line)
                    new_content = "\n".join(new_lines)
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    print(f"  [更新] {file_path} (frontmatter title)")
                    return True
        else:
            # 有 frontmatter 但没有 title，需要添加
            if check_only:
                print(f"  [需更新] {file_path} (frontmatter 缺少 title)")
                return True
            else:
                # 在 frontmatter 中添加 title
                lines = content.split("\n")
                new_lines = []
                for i, line in enumerate(lines):
                    new_lines.append(line)
                    if i == 0 and line.strip() == "---":
                        new_lines.append(f"title: {expected_title}")
                new_content = "\n".join(new_lines)
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"  [更新] {file_path} (添加 frontmatter title)")
                return True
    else:
        # 没有 frontmatter，需要添加
        if check_only:
            print(f"  [需更新] {file_path} (缺少 frontmatter)")
            return True
        else:
            # 添加 frontmatter
            frontmatter = f"---\ntitle: {expected_title}\n---\n\n"
            new_content = frontmatter + content
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"  [添加] {file_path} (frontmatter)")
            return True


def collect_articles(check_only: bool = False):
    """
    扫描项目目录，按章节目录名排序，章节内按文件名排序，
    返回有序的文章列表和章节元数据。
    """
    chapters = []
    if not os.path.exists(CONTENT_DIR):
        return [], []
    for entry in sorted(os.listdir(CONTENT_DIR)):
        full = os.path.join(CONTENT_DIR, entry)
        if os.path.isdir(full) and CHAPTER_PATTERN.match(entry):
            # 排除整个目录
            if entry in EXCLUDE_DIRS:
                print(f"  [排除目录] {entry}")
                continue
            md_files = sorted(
                f
                for f in os.listdir(full)
                if f.endswith(".md") and f"{entry}/{f}" not in EXCLUDE_FILES
            )
            if md_files:
                chapters.append({"dir": entry, "files": md_files})

    all_articles = []
    for ch in chapters:
        for fname in ch["files"]:
            fpath = os.path.join(CONTENT_DIR, ch["dir"], fname)
            title = get_article_title(fpath)
            all_articles.append(
                {
                    "dir": ch["dir"],
                    "file": fname,
                    "title": title,
                    "path": fpath,
                }
            )
    return all_articles, chapters

def generate_index_md(articles: list, check_only: bool = False) -> bool:
    """生成 docs/index.md"""
    index_path = os.path.join(BASE, "docs", "index.md")
    
    # 解析README.md的技术栈表格
    tech_stack = parse_readme_table()
    
    # 计算章节文档数量
    chapter_counts = {}
    for art in articles:
        chapter_counts[art["dir"]] = chapter_counts.get(art["dir"], 0) + 1
    
    # 构建表格
    table_lines = []
    table_lines.append("| 技术领域 | 内容 | 文档数量 |")
    table_lines.append("|---------|------|--------|")
    
    for item in tech_stack:
        domain = item["domain"]
        content = item["content"]
        
        # 计算文档数量
        total_count = 0
        first_link = ""
        chapters = TECH_TO_CHAPTERS.get(domain, [])
        for ch_dir in chapters:
            count = chapter_counts.get(ch_dir, 0)
            total_count += count
            if not first_link and count > 0:
                # 找到第一个文件
                for art in articles:
                    if art["dir"] == ch_dir:
                        first_link = f"{ch_dir}/{art['file']}"
                        break
        
        # 生成链接
        if first_link:
            link = f"[{domain}]({first_link})"
        else:
            link = domain
        
        table_lines.append(f"| {link} | {content} | {total_count} 篇 |")
    
    table_content = "\n".join(table_lines)
    
    index_content = f"""# The Stack

> 🎯 一份深度技术解析与实战沉淀的知识库

## 🛠️ 技术栈

本项目涉及的核心技术领域包括：

{table_content}

---

## 📚 内容导航

<!-- 这里可以添加章节导航或个人感受等自定义内容 -->
<!-- 脚本会自动更新上面的技术栈表格，下面内容保持不变 -->
"""
    
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            old = f.read()
        if old == index_content:
            return False
    
    if not check_only:
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(index_content)
        print(f"  [更新] docs/index.md")
    else:
        print(f"  [需更新] docs/index.md")
    return True


# ── 入口 ──────────────────────────────────────────────────────────────────────


def main():
    check_only = "--check" in sys.argv

    print("🔍 扫描文章...")
    articles, chapters_meta = collect_articles()
    print(f"   共发现 {len(articles)} 篇文章，{len(chapters_meta)} 个章节\n")

    print("\n� 生成 docs/index.md...")
    index_changed = generate_index_md(articles, check_only)

    print("\n�📝 处理 frontmatter...")
    for article in articles:
        add_frontmatter(article["path"], article["title"], check_only)
    print("\n✅ 完成！")

if __name__ == "__main__":
    main()
