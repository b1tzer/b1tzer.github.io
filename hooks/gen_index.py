#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_index.py — MkDocs hook：构建前自动生成 docs/index.md

注册方式（mkdocs.yml）：
    hooks:
      - hooks/gen_index.py

功能：
    - 在每次 mkdocs serve / mkdocs build 前自动执行
    - 扫描 docs/ 目录，统计各章节文章数量
    - 读取 tools/index_template.md，替换 {{TECH_CARDS}} 占位符
    - 将结果写入 docs/index.md
"""

import os
import re
import logging

log = logging.getLogger("mkdocs.hooks.gen_index")

# ── 扫描配置 ──────────────────────────────────────────────────────────────────

# 章节目录匹配规则（以数字开头的一级目录，如 01-java-basic）
_CHAPTER_PATTERN = re.compile(r"^\d+-.+$")

# 排除整个章节目录（填写目录名）
_EXCLUDE_DIRS: list[str] = ["10-project-experience"]

# 排除具体文章（填写 "目录名/文件名"）
_EXCLUDE_FILES: list[str] = []

# 技术领域 → emoji 图标映射
_DOMAIN_ICONS: dict[str, str] = {
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

# 匹配技术领域列中隐藏的目录注释，格式：<!-- dir:目录名 -->
_DIR_COMMENT = re.compile(r"<!--\s*dir:([\w,\-]+)\s*-->")

# ── 解析函数 ──────────────────────────────────────────────────────────────────


def _parse_readme_rows(base_dir: str) -> list[dict]:
    """
    解析 README.md 技术栈表格，返回每行结构化数据。

    表格格式（两列，目录名藏在注释里）：
        | 技术领域 <!-- dir:xxx --> | 内容 |

    返回：[{"domain": str, "dirs": list[str], "content": str}, ...]
    """
    readme_path = os.path.join(base_dir, "README.md")
    with open(readme_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

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
        if not stripped or not stripped.startswith("|") or stripped.startswith("|---"):
            break
        parts = [p.strip() for p in stripped.split("|")[1:-1]]
        if len(parts) < 2:
            continue

        domain_cell, content = parts[0], parts[1]

        m = _DIR_COMMENT.search(domain_cell)
        dirs = [d.strip() for d in m.group(1).split(",") if d.strip()] if m else []

        domain = re.sub(r"<!--.*?-->", "", domain_cell)
        domain = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", domain)
        domain = domain.replace("**", "").strip()

        rows.append({"domain": domain, "dirs": dirs, "content": content})
    return rows


def _collect_articles(docs_dir: str) -> list[dict]:
    """
    扫描 docs_dir，收集所有文章，返回每项含 dir / file / subdir(可选) 的列表。
    """
    articles = []
    for entry in sorted(os.listdir(docs_dir)):
        full = os.path.join(docs_dir, entry)
        if not (os.path.isdir(full) and _CHAPTER_PATTERN.match(entry)):
            continue
        if entry in _EXCLUDE_DIRS:
            continue

        # 章节根目录下的 .md 文件
        md_files = sorted(
            f for f in os.listdir(full)
            if f.endswith(".md") and os.path.isfile(os.path.join(full, f))
            and f"{entry}/{f}" not in _EXCLUDE_FILES
        )
        for fname in md_files:
            articles.append({"dir": entry, "file": fname})

        # 子目录（二级分组）
        for sub_entry in sorted(os.listdir(full)):
            sub_full = os.path.join(full, sub_entry)
            if not os.path.isdir(sub_full):
                continue
            sub_md_files = sorted(
                f for f in os.listdir(sub_full)
                if f.endswith(".md") and os.path.isfile(os.path.join(sub_full, f))
                and f"{entry}/{sub_entry}/{f}" not in _EXCLUDE_FILES
            )
            for fname in sub_md_files:
                articles.append({"dir": entry, "subdir": sub_entry, "file": fname})

    return articles


def _generate_index_md(base_dir: str) -> bool:
    """
    生成 docs/index.md。

    读取 tools/index_template.md，将其中的 {{TECH_CARDS}} 占位符替换为
    根据文章列表动态生成的卡片网格 HTML。

    返回：是否发生了写入（True = 有变更，False = 内容相同跳过）
    """
    docs_dir = os.path.join(base_dir, "docs")
    index_path = os.path.join(docs_dir, "index.md")
    template_path = os.path.join(base_dir, "tools", "index_template.md")

    # 读取模板
    with open(template_path, "r", encoding="utf-8") as f:
        template = f.read()

    articles = _collect_articles(docs_dir)

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

    # 构建卡片网格 HTML
    rows = _parse_readme_rows(base_dir)
    cards = ['<div class="card-grid" markdown>']
    for row in rows:
        domain, content = row["domain"], row["content"]
        total = sum(dir_count.get(d, 0) for d in row["dirs"])
        first = next((dir_first[d] for d in row["dirs"] if d in dir_first), "")
        icon = _DOMAIN_ICONS.get(domain, "📄")
        # MkDocs use_directory_urls 模式下，.md 文件会被转换为目录形式的 URL
        if first and first.endswith(".md"):
            first = first[:-3] + "/"
        href = f' href="{first}"' if first else ""
        cards.append(
            f'<a class="card"{href} markdown>\n'
            f'<span class="card-icon">{icon}</span>\n'
            f'<span class="card-title">{domain}</span>\n'
            f'<span class="card-desc">{content}</span>\n'
            f'<span class="card-count">{total} 篇文档</span>\n'
            f'</a>\n'
        )
    cards.append('</div>')

    index_content = template.replace("{{TECH_CARDS}}", "\n".join(cards))

    # 内容无变化则跳过写入
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            if f.read() == index_content:
                return False

    with open(index_path, "w", encoding="utf-8") as f:
        f.write(index_content)
    return True


# ── MkDocs Hook ───────────────────────────────────────────────────────────────


def on_pre_build(config, **kwargs):
    """
    MkDocs hook: on_pre_build 事件
    在 MkDocs 开始读取文件之前，自动重新生成 docs/index.md。
    """
    base_dir = os.path.dirname(config["config_file_path"])

    try:
        changed = _generate_index_md(base_dir)
        if changed:
            log.info("[gen_index] docs/index.md 已更新")
        else:
            log.debug("[gen_index] docs/index.md 无变化，跳过写入")
    except Exception as e:
        log.error(f"[gen_index] 生成 docs/index.md 失败: {e}")
        raise
