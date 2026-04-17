#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
inject_plantuml_style.py — MkDocs hook：向 kroki-plantuml 代码块自动注入公共样式

背景：
    mkdocs-kroki-plugin 把 Markdown 中的 ```kroki-plantuml ...``` 代码块
    POST 给远程 kroki 服务渲染。远程 kroki 无法读取本地文件系统，因此
    PlantUML 的 `!include 本地路径` 方案不可用。

方案：
    在构建阶段（on_page_markdown）扫描每个页面中的 kroki-plantuml 代码块，
    将公共 skinparam 片段内联插入到 `@startuml` 之后。这样：
      1. 每张图的源码里不再需要重复的 skinparam 样板
      2. 样式只在 docs/_snippets/plantuml-style.puml 一处维护
      3. 远程 kroki 看到的依然是完整可渲染的 puml 文本

关键：执行顺序
    mkdocs-kroki-plugin 也监听 on_page_markdown，会把 kroki-plantuml 代码块
    直接替换为 <img src="https://kroki.io/...">（puml 源被 deflate+base64
    编码进 URL）。这意味着：**我们必须在 kroki 插件之前注入样式**，否则
    等我们拿到 markdown 时代码块已经消失了。

    MkDocs 通过 @event_priority 控制回调顺序（数值越大越先执行，
    默认 0）。这里用 +100 确保比 kroki-plugin 先跑。
    （mkdocs>=1.4 支持）

约定：
    - 如果代码块已经包含 `skinparam backgroundColor`，视为手工定制样式，不再注入
    - 如果找不到 `@startuml` 行，跳过注入（兼容片段式写法）

注册方式（mkdocs.yml）：
    hooks:
      - hooks/inject_plantuml_style.py
"""

import logging
import os
import re

from mkdocs.plugins import event_priority

log = logging.getLogger("mkdocs.hooks.inject_plantuml_style")

# 公共样式片段相对于 docs/ 目录的路径
_SNIPPET_REL_PATH = os.path.join("_snippets", "plantuml-style.puml")

# 缓存样式文本内容
_style_text: str = ""

# 匹配一个 ```kroki-plantuml ... ``` 代码块（非贪婪、跨行）
_FENCE_PATTERN = re.compile(
    r"(^|\n)(```kroki-plantuml\s*\n)(.*?)(\n```)",
    re.DOTALL,
)


def on_config(config, **kwargs):
    """加载公共样式文本到内存缓存。"""
    global _style_text

    docs_dir = config["docs_dir"]
    snippet_path = os.path.join(docs_dir, _SNIPPET_REL_PATH)

    if not os.path.exists(snippet_path):
        log.warning(f"[inject_plantuml_style] 样式片段不存在: {snippet_path}")
        _style_text = ""
        return config

    with open(snippet_path, "r", encoding="utf-8") as f:
        _style_text = f.read().rstrip() + "\n"

    log.info(
        f"[inject_plantuml_style] 已加载公共样式 "
        f"({len(_style_text)} 字节) from {_SNIPPET_REL_PATH}"
    )
    return config


def _inject(body: str) -> str:
    """向单个 kroki-plantuml 代码块的 body 注入公共样式。"""
    # 已手工定制样式，跳过
    if "skinparam backgroundColor" in body:
        return body

    lines = body.split("\n")
    injected = False
    out_lines: list[str] = []
    for line in lines:
        out_lines.append(line)
        if not injected and line.strip().startswith("@startuml"):
            # 在 @startuml 之后立即插入公共样式
            out_lines.append(_style_text.rstrip("\n"))
            injected = True

    if not injected:
        # 没有 @startuml，原样返回
        return body

    return "\n".join(out_lines)


# priority=100：比 kroki-plugin 的默认 0 早执行，
# 确保在 kroki 把代码块替换成 <img> 之前，我们先把 skinparam 注入进去
@event_priority(100)
def on_page_markdown(markdown, page, config, files, **kwargs):
    """在每个页面渲染前，向所有 kroki-plantuml 代码块注入公共样式。"""
    if not _style_text:
        return markdown

    count = 0

    def _replace(match: re.Match) -> str:
        nonlocal count
        prefix, fence_open, body, fence_close = match.groups()
        new_body = _inject(body)
        if new_body != body:
            count += 1
        return f"{prefix}{fence_open}{new_body}{fence_close}"

    new_markdown = _FENCE_PATTERN.sub(_replace, markdown)

    if count > 0:
        log.info(
            f"[inject_plantuml_style] {page.file.src_path}: "
            f"向 {count} 个 kroki-plantuml 代码块注入了公共样式"
        )

    return new_markdown
