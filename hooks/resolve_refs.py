#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
resolve_refs.py — MkDocs hook：构建时将 @id 引用替换为真实路径

用法（在 Markdown 中）：
    [MVCC与VACUUM机制](@pg-MVCC与VACUUM机制)
    [Spring Cloud 核心组件](@spring-微服务与安全-Spring-Cloud核心组件)

构建时会自动替换为：
    [MVCC与VACUUM机制](../04-postgresql/02-MVCC与VACUUM机制.md)
    [Spring Cloud 核心组件](../../02-spring/03-微服务与安全/02-Spring-Cloud核心组件.md)

注册方式（mkdocs.yml）：
    hooks:
      - hooks/resolve_refs.py
"""

import json
import os
import re
import logging
from pathlib import PurePosixPath

log = logging.getLogger("mkdocs.hooks.resolve_refs")

# ── 全局变量 ──────────────────────────────────────────────────────────────────

# ID 注册表：doc_id → 相对于 docs/ 的路径
_registry: dict[str, str] = {}

# @id 引用的正则：匹配 [文本](@some-id) 或 [文本](@some-id#anchor)
_REF_PATTERN = re.compile(
    r'\[([^\]]*)\]'                     # [链接文本]
    r'\('                                # (
    r'@([^\)#\s]+)'                      # @doc-id（支持除 )#空格 外的任意字符）
    r'(#[^\)]*)?'                        # 可选的 #anchor
    r'\)'                                # )
)


def on_config(config, **kwargs):
    """
    MkDocs hook: on_config 事件
    在配置加载后读取 ID 注册表。
    """
    global _registry

    # 注册表路径：项目根目录/tools/doc_id_registry.json
    base_dir = os.path.dirname(config["config_file_path"])
    registry_path = os.path.join(base_dir, "tools", "doc_id_registry.json")

    if not os.path.exists(registry_path):
        log.warning(f"[resolve_refs] 注册表不存在: {registry_path}")
        log.warning("[resolve_refs] 请先运行 python3 tools/gen_nav.py 生成注册表")
        return config

    with open(registry_path, "r", encoding="utf-8") as f:
        _registry = json.load(f)

    log.info(f"[resolve_refs] 已加载 {len(_registry)} 条文档 ID 映射")
    return config


def on_page_markdown(markdown, page, config, files, **kwargs):
    """
    MkDocs hook: on_page_markdown 事件
    在每个页面的 Markdown 被渲染为 HTML 之前，替换 @id 引用。
    """
    if not _registry:
        return markdown

    # 当前页面相对于 docs/ 的路径
    src_path = page.file.src_path  # 例如 "09-software-engineering/02-软件架构演进.md"

    # 跳过首页，index.md 由 gen_nav.py 自动生成，无需处理 @id 引用
    if src_path == "index.md":
        return markdown

    def _replace_ref(match):
        link_text = match.group(1)
        doc_id = match.group(2)
        anchor = match.group(3) or ""

        if doc_id not in _registry:
            log.warning(
                f"[resolve_refs] 未知的文档 ID '@{doc_id}' "
                f"(在 {src_path} 中)"
            )
            # 保留原文，不替换，避免破坏内容
            return match.group(0)

        target_path = _registry[doc_id]  # 例如 "04-postgresql/02-MVCC与VACUUM机制.md"

        # 计算从当前页面到目标页面的相对路径
        src_dir = str(PurePosixPath(src_path).parent)
        rel_path = os.path.relpath(target_path, src_dir).replace("\\", "/")

        return f"[{link_text}]({rel_path}{anchor})"

    new_markdown = _REF_PATTERN.sub(_replace_ref, markdown)

    # 统计替换数量
    count = len(_REF_PATTERN.findall(markdown))
    if count > 0:
        log.info(f"[resolve_refs] {src_path}: 替换了 {count} 个 @id 引用")

    return new_markdown
