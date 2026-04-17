#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_index.py — MkDocs hook：构建前自动同步 docs/index.md 并注入首页数据

注册方式（mkdocs.yml）：
    hooks:
      - hooks/gen_index.py

功能：
    - 在每次 mkdocs serve / mkdocs build 前自动执行
    - 将 tools/index_template.md 同步写入 docs/index.md（仅作路由锚点，正文由 home.html 渲染）
    - 扫描 docs/ 目录，统计各章节文章数量
    - 将统计结果注入 config['extra']['home_stats']
    - 将技术栈元数据注入 config['extra']['tech_stacks']（单一数据源，供 home.html 遍历）
    - 将"开始阅读"按钮目标 URL 注入 config['extra']['home_cta_url']
"""

import os
import re
import time
import logging

log = logging.getLogger("mkdocs.hooks.gen_index")

# ── 扫描配置 ──────────────────────────────────────────────────────────────────

# 章节目录匹配规则（以数字开头的一级目录，如 01-java-basic）
_CHAPTER_PATTERN = re.compile(r"^\d+-.+$")

# 排除整个章节目录（填写目录名）
_EXCLUDE_DIRS: list[str] = ["10-project-experience"]

# 排除具体文章（填写 "目录名/文件名"）
_EXCLUDE_FILES: list[str] = []

# ── 技术栈图标（SVG path）——单一数据源 ──────────────────────────────────────
# 均为 24x24 viewBox，仅保留 <path d="..."/>，颜色由 CSS 通过 currentColor 控制。
# 来源：
#   - Simple Icons (https://simpleicons.org/)：品牌类（Java/Spring/MySQL/...）
#   - Material Design Icons：抽象概念（设计模式 / 软件工程）
_STACK_ICONS: dict[str, str] = {
    # Simple Icons - Java 咖啡杯
    "java": '<path d="M8.851 18.56s-.917.534.653.714c1.902.218 2.874.187 4.969-.211 0 0 .552.346 1.321.646-4.699 2.013-10.633-.118-6.943-1.149M8.276 15.933s-1.028.761.542.924c2.032.209 3.636.227 6.413-.308 0 0 .384.389.987.602-5.679 1.661-12.007.13-7.942-1.218M13.116 11.475c1.158 1.333-.304 2.533-.304 2.533s2.939-1.518 1.589-3.418c-1.261-1.772-2.228-2.652 3.007-5.688 0-.001-8.216 2.051-4.292 6.573M19.33 20.504s.679.559-.747.991c-2.712.822-11.288 1.069-13.669.033-.856-.373.75-.89 1.254-.998.527-.114.828-.093.828-.093-.953-.671-6.156 1.317-2.643 1.887 9.58 1.553 17.462-.7 14.977-1.82M9.292 13.21s-4.362 1.036-1.544 1.412c1.189.159 3.561.123 5.77-.062 1.806-.152 3.618-.477 3.618-.477s-.637.272-1.098.587c-4.429 1.165-12.986.623-10.522-.568 2.082-1.006 3.776-.892 3.776-.892M17.116 17.584c4.503-2.34 2.421-4.589.968-4.285-.355.074-.515.138-.515.138s.132-.207.385-.297c2.875-1.011 5.086 2.981-.928 4.562 0 0 .07-.062.09-.118M14.401 0s2.494 2.494-2.365 6.33c-3.896 3.077-.888 4.832-.001 6.836-2.274-2.053-3.943-3.858-2.824-5.539 1.644-2.469 6.197-3.665 5.19-7.627M9.734 23.924c4.322.277 10.959-.153 11.116-2.198 0 0-.302.775-3.572 1.391-3.688.694-8.239.613-10.937.168 0-.001.553.457 3.393.639"/>',
    # Simple Icons - Spring 叶
    "spring": '<path d="M21.854 1.416a10.511 10.511 0 0 1-1.267 2.246A11.956 11.956 0 1 0 3.852 20.776l.458.406a11.954 11.954 0 0 0 19.632-8.559c.304-2.955-.608-6.672-2.088-11.207zM5.588 20.494a1.034 1.034 0 0 1-1.469.104 1.038 1.038 0 0 1-.104-1.469 1.038 1.038 0 0 1 1.469-.104c.438.385.48 1.042.104 1.469zm16.224-3.586c-2.984 3.976-9.365 2.633-13.453 2.825 0 0-.725.042-1.453.156 0 0 .274-.115.628-.25 2.861-.994 4.215-1.188 5.959-2.083 3.277-1.676 6.531-5.344 7.211-9.156-1.261 3.688-5.084 6.859-8.561 8.146-2.385.875-6.693 1.729-6.693 1.729l-.172-.094c-2.927-1.427-3.016-7.781 2.3-9.813 2.328-.891 4.552-.401 7.062-1 2.678-.635 5.781-2.646 7.041-5.261 1.412 4.193 3.11 10.751.131 14.801z"/>',
    # Simple Icons - MySQL 海豚
    "mysql": '<path d="M16.405 5.501c-.115 0-.193.014-.274.033v.013h.014c.054.104.146.18.214.273.054.107.1.214.154.32l.014-.015c.094-.066.14-.172.14-.333-.04-.047-.046-.094-.08-.14-.04-.067-.126-.1-.18-.153zM5.77 18.695h-.927a50.854 50.854 0 00-.27-4.41h-.008l-1.41 4.41H2.45l-1.4-4.41h-.01a72.892 72.892 0 00-.195 4.41H0c.055-1.966.192-3.81.41-5.53h1.15l1.335 4.064h.008l1.347-4.064h1.095c.242 2.015.384 3.86.428 5.53zm4.017-4.08c-.378 2.045-.876 3.533-1.492 4.46-.482.716-1.01 1.073-1.583 1.073-.153 0-.34-.046-.566-.138v-.494c.11.017.24.026.386.026.268 0 .483-.075.647-.222.197-.18.295-.382.295-.605 0-.155-.077-.47-.23-.944L6.23 14.615h.91l.727 2.36c.164.536.233.91.205 1.123.4-1.064.678-2.227.835-3.483zm12.325 4.08h-2.63v-5.53h.885v4.85h1.745zm-3.32.135l-1.016-.5c.09-.076.177-.158.255-.25.433-.506.648-1.258.648-2.253 0-1.83-.718-2.746-2.155-2.746-.704 0-1.254.232-1.65.697-.43.51-.646 1.26-.646 2.245 0 .97.19 1.68.574 2.14.35.412.877.62 1.583.62.264 0 .506-.033.725-.098l1.325.77.36-.625zM15.5 17.588c-.225-.36-.337-.94-.337-1.736 0-1.393.424-2.09 1.27-2.09.443 0 .77.167.977.5.224.362.336.936.336 1.723 0 1.404-.424 2.108-1.27 2.108-.445 0-.77-.167-.978-.5zm-1.658-.425c0 .47-.172.856-.516 1.156-.344.3-.803.45-1.384.45-.543 0-1.064-.172-1.573-.515l.237-.476c.438.22.833.328 1.19.328.333 0 .593-.073.783-.22a.754.754 0 00.3-.615c0-.33-.23-.61-.648-.845-.388-.213-1.163-.657-1.163-.657-.422-.307-.632-.636-.632-1.177 0-.45.157-.81.47-1.085.315-.278.72-.415 1.22-.415.512 0 .98.136 1.4.41l-.213.476a2.726 2.726 0 00-1.064-.23c-.283 0-.502.068-.654.206a.685.685 0 00-.248.524c0 .328.234.61.666.85.393.215 1.187.67 1.187.67.433.305.648.63.648 1.168zm9.382-5.852c-.535-.014-.95.04-1.297.188-.1.04-.26.04-.274.167.055.053.063.14.11.214.08.134.218.313.346.407.14.11.28.216.427.31.26.16.555.255.81.416.145.094.293.213.44.313.073.05.12.14.214.172v-.02c-.046-.06-.06-.147-.105-.214-.067-.067-.134-.127-.2-.193a3.223 3.223 0 00-.695-.675c-.214-.146-.682-.35-.77-.595l-.013-.014c.146-.013.32-.066.46-.106.227-.06.435-.047.67-.106.106-.027.213-.06.32-.094v-.06c-.12-.12-.21-.283-.334-.395a8.867 8.867 0 00-1.104-.823c-.21-.134-.478-.22-.7-.334-.08-.04-.214-.06-.26-.127-.12-.146-.19-.34-.275-.514a17.69 17.69 0 01-.547-1.163c-.12-.262-.193-.523-.34-.763-.69-1.137-1.437-1.826-2.586-2.5-.247-.14-.543-.2-.856-.274-.167-.008-.334-.02-.5-.027-.11-.047-.216-.174-.31-.235-.38-.24-1.364-.76-1.644-.072-.18.434.267.862.422 1.082.115.153.26.326.34.5.047.116.06.235.107.356.106.294.207.622.347.897.073.14.153.287.247.413.054.073.146.107.167.227-.094.136-.1.334-.154.5-.24.757-.146 1.693.194 2.25.107.166.362.534.703.393.3-.12.234-.5.32-.835.02-.08.007-.133.048-.187v.015c.094.186.188.367.274.554.207.328.573.668.876.895.16.12.287.328.487.402v-.02h-.015c-.043-.058-.1-.086-.154-.133a3.445 3.445 0 01-.35-.4 8.76 8.76 0 01-.747-1.218c-.11-.21-.202-.436-.29-.643-.04-.08-.04-.2-.107-.24-.1.146-.247.274-.32.453-.127.285-.14.635-.187.997-.027.014-.014 0-.027.014-.21-.05-.283-.267-.362-.453-.2-.47-.235-1.222-.063-1.763.047-.14.247-.576.167-.71-.042-.127-.174-.2-.247-.302a2.557 2.557 0 01-.24-.427c-.16-.374-.24-.788-.414-1.16-.08-.173-.22-.354-.334-.513-.127-.18-.267-.307-.368-.52-.033-.073-.08-.194-.027-.274.014-.054.042-.074.094-.09.088-.072.334.022.422.062.247.1.455.194.662.334.094.066.195.193.315.227h.14c.214.047.455.014.655.073.355.114.675.28.962.46a5.953 5.953 0 012.085 2.286c.08.154.114.295.188.455.14.33.313.663.455.982.14.315.275.636.476.897.1.14.502.213.682.287.133.06.34.116.46.187.226.136.448.293.662.44.107.073.44.227.46.36z"/>',
    # Simple Icons - PostgreSQL 象
    "postgresql": '<path d="M23.5594 14.7228a.5269.5269 0 0 0-.0563-.1191c-.139-.2632-.4768-.3418-1.0074-.2321-1.6533.3411-2.2935.1312-2.5256-.027 1.2303-1.8779 2.2433-4.1452 2.7904-6.2694.2585-1.0049.4014-1.9074.4155-2.6612.0166-.823-.1386-1.4300-.4607-1.8253-1.2984-1.5934-3.2039-2.4500-5.6931-2.5612a11.418 11.418 0 0 0-2.7024.2373C11.9999 1.1262 10.8828.8462 9.7812 1.0057c-2.1149.3072-3.9968 1.547-4.9683 3.2822a5.0268 5.0268 0 0 0-.3892 1.0225c-.6487.3007-1.2003.6965-1.6342 1.1795-1.0615 1.1805-1.5889 2.7615-1.5889 4.7392 0 1.4735.5213 2.6904 1.4693 3.4237.7515.5807 1.6625.8627 2.5842.8178.4553-.0223.8866-.1199 1.2817-.2837-.0039.0562-.0062.1123-.0070.1688-.0062.4225.0683.8232.2187 1.1850.1498.3612.3671.6850.6397.9540.6232.6169 1.4692.9523 2.3829.9523 1.0826 0 2.0833-.5059 2.7055-1.3663.2085.1039.4303.1937.6630.2683.2327.0746.4707.1311.7127.1690a4.9 4.9 0 0 0 .7436.0562c.2506 0 .5024-.0201.7491-.0599a3.7 3.7 0 0 0 .6999-.1735 3.15 3.15 0 0 0 .5955-.2742c.0931.0619.1872.1201.2808.1763.0936.0562.1849.1087.2745.1563.0896.0476.1751.0892.2561.1247.0810.0355.1562.0645.2251.0868.0688.0223.1305.0379.1850.0468.0546.0089.1001.0134.1366.0134a.521.521 0 0 0 .2251-.0468c.0604-.0312.1108-.0746.1498-.1296.0395-.0551.0683-.1207.0857-.1953a.9879.9879 0 0 0 .0279-.2385c0-.0876-.0095-.1779-.0279-.2700a3.0 3.0 0 0 0-.0857-.2807 3.6 3.6 0 0 0-.1406-.2907z"/>',
    # Simple Icons - Redis 立方
    "redis": '<path d="M10.5 1.09c2.55-.14 5.68.5 6.67 1.75.35.48.28.94-.23 1.39-1.3 1.02-4.99 1.8-8.76 1.45C4.16 5.35 1.2 3.84 1.39 2.72c.2-1.17 4.15-1.52 9.1-1.63h.01zm6.52 14.2c-1.04 2.14-4.04 3.5-8 3.37-3.97-.13-7-2.39-7.95-4.63-.4-.95-.04-1.53 1.07-1.57 2.33-.09 5.61 1.3 7.46 1.36 1.85.06 4.82-.75 6.83-.88 1.02-.07 1.06.52.59 2.35zM12 9.72c-3.57 0-6.47 1.17-6.47 2.62 0 1.44 2.9 2.61 6.47 2.61s6.47-1.17 6.47-2.61c0-1.45-2.9-2.62-6.47-2.62zM1.86 8.13c-.56-1.01.46-1.83 2.79-2.44 2.72-.71 6.99-.83 10.16-.13 3.26.72 5.63 2.26 5.38 3.43-.24 1.16-3.14 1.93-6.5 1.77-4.22-.2-11.2-1.5-11.83-2.63z"/>',
    # Simple Icons - Apache Kafka
    "kafka": '<path d="M9.71 6.773a2.884 2.884 0 1 1 5.769 0 2.884 2.884 0 0 1-5.769 0zm2.884 10.455a2.884 2.884 0 1 0 0 5.769 2.884 2.884 0 0 0 0-5.769zM9.71 12a2.884 2.884 0 1 1 5.769 0A2.884 2.884 0 0 1 9.71 12zm-4.72-2.105a2.43 2.43 0 1 0 0 4.86 2.43 2.43 0 0 0 0-4.86zm1.8 5.656a2.884 2.884 0 0 1 4.88 1.51m0-10.12a2.884 2.884 0 0 1-4.88 1.509m13.32-.755a2.43 2.43 0 1 0-2.43-2.43 2.43 2.43 0 0 0 2.43 2.43zm0 2.37a2.43 2.43 0 1 0 2.43 2.43 2.43 2.43 0 0 0-2.43-2.43zm-1.83 4.19a2.884 2.884 0 0 1-4.87 1.51m-.02-10.12a2.884 2.884 0 0 1 4.88-1.511"/>',
    # Simple Icons - Elasticsearch
    "elasticsearch": '<path d="M13.394 0C8.683 0 4.609 2.716 2.644 6.667h15.641a4.77 4.77 0 0 0 3.073-1.11c.446-.375.864-.804 1.247-1.291A11.945 11.945 0 0 0 13.394 0zM1.804 8.889a12.009 12.009 0 0 0 0 6.222h13.52a3.111 3.111 0 1 0 0-6.222zm.84 8.444C4.61 21.283 8.684 24 13.394 24a11.944 11.944 0 0 0 9.21-4.266 8.006 8.006 0 0 0-1.246-1.291 4.77 4.77 0 0 0-3.073-1.11z"/>',
    # Material Icons - extension（设计模式：拼图块）
    "design_pattern": '<path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/>',
    # Material Icons - architecture（软件工程：几何工程图）
    "software_engineering": '<path d="M12 16c-1.1 0-2 .9-2 2 0 .74.4 1.38 1 1.72V22h2v-2.28c.6-.35 1-.98 1-1.72 0-1.1-.9-2-2-2zm6.33-2.54l-4.64-12.1C13.43.92 12.75.5 12 .5s-1.43.42-1.69 1.06l-4.64 12.1c-.16.43-.02.92.35 1.19.38.28.89.3 1.28.04L12 11.78l4.69 3.11c.2.13.41.19.63.19.23 0 .46-.08.65-.22.38-.28.52-.76.36-1.2z"/>',
}


# ── 技术栈元数据 —— 单一数据源 ────────────────────────────────────────────────
# 该列表同时用于：
#   1) 统计 key 映射（dir → stat_key）
#   2) 首页右栏卡片渲染（name / url / color / tags）
# 首个条目用作"开始阅读"按钮默认落点（home_cta_url）
_TECH_STACKS: list[dict] = [
    {
        "dir": "00-Env",
        "key": "env",
        "name": "环境搭建",
        "entry": "Markdown使用指南.md",
        "color": "#64748b",
        "tags": ["Markdown", "Windows", "命令行"],
        "in_home": False,  # 不在首页卡片中展示
    },
    {
        "dir": "01-java-basic",
        "key": "java",
        "name": "Java",
        "entry": "00-Java基础与JVM概览.md",
        "color": "#f89820",
        "tags": ["并发", "JVM", "集合", "NIO"],
        "in_home": True,
    },
    {
        "dir": "02-spring",
        "key": "spring",
        "name": "Spring",
        "entry": "00-spring-core.md",
        "color": "#6db33f",
        "tags": ["IoC", "AOP", "Boot", "Cloud"],
        "in_home": True,
    },
    {
        "dir": "03-mysql",
        "key": "mysql",
        "name": "MySQL",
        "entry": "00-mysql-overview.md",
        "color": "#4479a1",
        "tags": ["索引", "事务", "InnoDB", "分片"],
        "in_home": True,
    },
    {
        "dir": "04-postgresql",
        "key": "postgresql",
        "name": "PostgreSQL",
        "entry": "00-postgresql-overview.md",
        "color": "#336791",
        "tags": ["MVCC", "索引", "JSONB", "窗口函数"],
        "in_home": True,
    },
    {
        "dir": "05-redis",
        "key": "redis",
        "name": "Redis",
        "entry": "00-redis-overview.md",
        "color": "#dc382d",
        "tags": ["缓存", "持久化", "分布式锁", "集群"],
        "in_home": True,
    },
    {
        "dir": "06-kafka",
        "key": "kafka",
        "name": "Kafka",
        "entry": "00-kafka-overview.md",
        "color": "#a0a0a0",
        "tags": ["可靠性", "高吞吐", "事务", "KRaft"],
        "in_home": True,
    },
    {
        "dir": "07-elasticsearch",
        "key": "elasticsearch",
        "name": "Elasticsearch",
        "entry": "00-elasticsearch概览.md",
        "color": "#f04e98",
        "tags": ["倒排索引", "DSL", "分片", "聚合"],
        "in_home": True,
    },
    {
        "dir": "08-design-pattern",
        "key": "design_pattern",
        "name": "设计模式",
        "entry": "00-设计模式总览.md",
        "color": "#8b5cf6",
        "tags": ["创建型", "结构型", "行为型", "GoF"],
        "in_home": True,
    },
    {
        "dir": "09-software-engineering",
        "key": "software_engineering",
        "name": "软件工程",
        "entry": "00-软件工程概览.md",
        "color": "#0ea5e9",
        "tags": ["SOLID", "DDD", "CAP", "系统设计"],
        "in_home": True,
    },
]

# ── 解析函数 ──────────────────────────────────────────────────────────────────


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


def _md_to_url(dir_name: str, md_file: str) -> str:
    """
    将章节目录 + md 文件名转换为 MkDocs URL 片段（不含站点前缀）。
    例：("01-java-basic", "00-Java基础与JVM概览.md") →
        "01-java-basic/00-Java基础与JVM概览/"
    """
    slug = md_file[:-3] if md_file.endswith(".md") else md_file
    return f"{dir_name}/{slug}/"


def _latest_git_commit_time(repo, root: str) -> float:
    """
    使用 GitPython 查询指定目录下 .md 文件的最新一次提交时间戳（秒）。

    任何失败场景（repo 为空 / 目录不存在 / 无提交历史 / 异常）均返回 0.0，
    调用方据此显示 "—"，不做任何回退。
    """
    if repo is None or not os.path.isdir(root):
        return 0.0
    try:
        # 计算相对于仓库根的路径（git log 要求仓库内路径）
        rel = os.path.relpath(root, repo.working_tree_dir)
        # 取最近一次触及该目录的 commit（不限文件后缀，但目录内只放 .md 足矣）
        commits = list(repo.iter_commits(paths=rel, max_count=1))
        if not commits:
            return 0.0
        return float(commits[0].committed_date)
    except Exception as e:
        log.debug(f"[gen_index] git log 失败 ({root}): {e}")
        return 0.0


def _humanize_updated(ts: float, now: float | None = None) -> str:
    """
    将 commit 时间戳转换为人性化的中文文本。

    参数：
      ts  - Unix 时间戳（秒）；对应该目录下最新一次 git commit 时间。
      now - 可注入的 "当前时间"，便于单元测试；默认取 time.time()。

    规则：
      ts <= 0     -> ""（调用方据此隐藏 updated 元素）
      今天         -> "今日更新"
      1 天前       -> "昨日更新"
      2-6 天前     -> "X 天前"
      7-30 天前    -> "X 周前"
      31-365 天前  -> "X 月前"
      > 365 天     -> "去年更新" / "X 年前"
    """
    if ts <= 0:
        return ""
    now = now if now is not None else time.time()
    delta_sec = max(0.0, now - ts)
    days = int(delta_sec // 86400)

    if days <= 0:
        return "今日更新"
    if days == 1:
        return "昨日更新"
    if days < 7:
        return f"{days} 天前"
    if days < 30:
        weeks = days // 7
        return f"{weeks} 周前"
    if days < 365:
        months = days // 30
        return f"{months} 月前"
    years = days // 365
    return "去年更新" if years == 1 else f"{years} 年前"


def _build_home_stats(docs_dir: str) -> dict:
    """
    扫描 docs/ 目录，统计各章节文章数量，返回供 home.html 使用的统计字典。
    """
    articles = _collect_articles(docs_dir)

    # 按目录统计文章数
    dir_count: dict[str, int] = {}
    for art in articles:
        d = art["dir"]
        dir_count[d] = dir_count.get(d, 0) + 1

    stats: dict = {}
    tech_total = 0
    tech_topics = 0

    for stack in _TECH_STACKS:
        count = dir_count.get(stack["dir"], 0)
        stats[stack["key"]] = count
        # env 不计入技术主题统计
        if stack["key"] != "env" and count > 0:
            tech_total += count
            tech_topics += 1

    stats["topics"] = tech_topics
    stats["total"] = tech_total
    return stats


def _build_tech_stacks_for_home(stats: dict, docs_dir: str) -> list[dict]:
    """
    构造首页右栏卡片渲染所需的技术栈列表（仅包含 in_home=True 的条目）。
    每项字段：id / name / url / color / tags / count / icon_svg / updated

    updated 字段来源：GitPython 查询目录最新 commit 时间。
    任何获取失败（GitPython 未安装 / 非 Git 仓库 / 无提交历史 / 异常）
    均返回空字符串，不做文件系统 mtime 回退。
    """
    items = []
    now = time.time()

    # 尝试打开 Git 仓库（GitPython 是 mkdocs-git-revision-date-localized-plugin 的传递依赖）
    repo = None
    try:
        from git import Repo  # type: ignore
        repo = Repo(os.path.dirname(docs_dir), search_parent_directories=True)
    except Exception as e:
        log.warning(f"[gen_index] GitPython 不可用或仓库打开失败，updated 字段将置空: {e}")

    for stack in _TECH_STACKS:
        if not stack.get("in_home"):
            continue
        stack_dir_path = os.path.join(docs_dir, stack["dir"])
        commit_time = _latest_git_commit_time(repo, stack_dir_path)
        items.append({
            "id":       stack["key"],
            "name":     stack["name"],
            "url":      _md_to_url(stack["dir"], stack["entry"]),
            "color":    stack["color"],
            "tags":     stack["tags"],
            "count":    stats.get(stack["key"], 0),
            "icon_svg": _STACK_ICONS.get(stack["key"], ""),
            "updated":  _humanize_updated(commit_time, now),
        })
    return items


def _build_home_cta_url() -> str:
    """
    取首个 in_home=True 的条目作为"开始阅读"按钮的默认目标 URL。
    """
    for stack in _TECH_STACKS:
        if stack.get("in_home"):
            return _md_to_url(stack["dir"], stack["entry"])
    return ""


def _generate_index_md(base_dir: str) -> bool:
    """
    同步 docs/index.md。

    读取 tools/index_template.md，直接写入 docs/index.md。
    index.md 仅作为 MkDocs 首页路由锚点，正文内容由 home.html 模板负责渲染。

    返回：是否发生了写入（True = 有变更，False = 内容相同跳过）
    """
    docs_dir = os.path.join(base_dir, "docs")
    index_path = os.path.join(docs_dir, "index.md")
    template_path = os.path.join(base_dir, "tools", "index_template.md")

    with open(template_path, "r", encoding="utf-8") as f:
        index_content = f.read()

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
    在 MkDocs 开始读取文件之前：
    1. 同步 docs/index.md（从 tools/index_template.md）
    2. 统计各章节文章数量，注入 config['extra']['home_stats']
    3. 注入 config['extra']['tech_stacks']（首页卡片数据源）
    4. 注入 config['extra']['home_cta_url']（"开始阅读"按钮目标）
    """
    base_dir = os.path.dirname(config["config_file_path"])
    docs_dir = os.path.join(base_dir, "docs")

    try:
        # 1. 同步 index.md
        changed = _generate_index_md(base_dir)
        if changed:
            log.info("[gen_index] docs/index.md 已更新")
        else:
            log.debug("[gen_index] docs/index.md 无变化，跳过写入")

        # 2. 构建并注入首页数据
        stats = _build_home_stats(docs_dir)
        tech_stacks = _build_tech_stacks_for_home(stats, docs_dir)
        cta_url = _build_home_cta_url()

        if "extra" not in config:
            config["extra"] = {}
        config["extra"]["home_stats"] = stats
        config["extra"]["tech_stacks"] = tech_stacks
        config["extra"]["home_cta_url"] = cta_url

        log.info(
            f"[gen_index] home 数据已注入："
            f"{stats['topics']} 主题 / {stats['total']} 篇 / "
            f"cta={cta_url}"
        )
    except Exception as e:
        log.error(f"[gen_index] gen_index hook 执行失败: {e}")
        raise
