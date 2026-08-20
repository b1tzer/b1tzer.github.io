# 存储架构

## 1. 数据文件组织

```
PGDATA/
├── base/                    # 数据库目录
│   ├── 16384/              # 数据库 OID
│   │   ├── 16384          # 表文件（relfilenode）
│   │   ├── 16384.1        # 表文件扩展
│   │   ├── 16384_fsm      # 空闲空间映射
│   │   └── 16384_vm       # 可见性映射
│   └── ...
├── global/                  # 集群共享数据
├── pg_wal/                  # WAL 日志
└── pg_xact/                 # 事务提交状态
```

## 2. 页面结构

```
┌─────────────────┐
│ PageHeaderData  │ 24字节
├─────────────────┤
│ Item 1 (指针)    │
│ Item 2 (指针)    │
│ ...              │
├─────────────────┤
│ Free Space      │
├─────────────────┤
│ Tuple N         │
│ ...              │
│ Tuple 2         │
│ Tuple 1         │
└─────────────────┘
```

## 3. 元组结构

```
┌─────────────────┐
│ t_xmin          │ 插入事务ID
│ t_xmax          │ 删除/锁定事务ID
│ t_ctid          │ 当前/更新后的元组位置
│ t_infomask      │ 状态标志位
│ t_hoff          │ 用户数据偏移
├─────────────────┤
│ NULL Bitmap     │
├─────────────────┤
│ User Data       │
└─────────────────┘
```
## 4. TOAST 机制

当单行数据超过页面大小（默认 8KB）时，PG 使用 TOAST（The Oversized-Attribute Storage Technique）将大字段压缩或存储到独立的 TOAST 表中。

```sql
-- 查看表的 TOAST 表
SELECT relname, reltoastrelid::regclass
FROM pg_class WHERE relname = 'large_table';

-- TOAST 存储策略
-- PLAIN：不压缩，不外部存储（用于不可 TOAST 的类型）
-- EXTENDED：先压缩，再外部存储（默认，大多数类型）
-- EXTERNAL：不压缩，直接外部存储（适合已压缩的数据如 JPEG）
-- MAIN：先压缩，尽量不外部存储

-- 设置列的 TOAST 策略
ALTER TABLE large_table ALTER COLUMN content SET STORAGE EXTERNAL;
```

> **最佳实践**：对于已经压缩过的数据（如图片、压缩文件），使用 `EXTERNAL` 策略避免重复压缩浪费 CPU。对于文本字段，使用默认的 `EXTENDED` 策略。

## 5. 表空间

表空间允许将不同表的数据存储到不同的磁盘或文件系统。

```sql
-- 创建表空间
CREATE TABLESPACE fast_disk LOCATION '/ssd/pg_data';

-- 在指定表空间创建表
CREATE TABLE hot_data (
    id SERIAL PRIMARY KEY,
    data TEXT
) TABLESPACE fast_disk;

-- 移动表到其他表空间
ALTER TABLE hot_data SET TABLESPACE fast_disk;

-- 查看表空间
SELECT spcname, pg_tablespace_location(oid)
FROM pg_tablespace;

-- 查看各表空间大小
SELECT
    spcname,
    pg_size_pretty(pg_tablespace_size(spcname))
FROM pg_tablespace;
```

> **使用场景**：将热点数据放在 SSD 表空间，冷数据放在 HDD 表空间。但大多数场景下，使用操作系统的文件系统层级管理（如 SSD 分区）更简单。

## 6. 数据文件管理

```sql
-- 查看数据库大小
SELECT pg_size_pretty(pg_database_size(current_database()));

-- 查看表大小（含索引和 TOAST）
SELECT pg_size_pretty(pg_total_relation_size('users'));

-- 查看表大小（仅堆表）
SELECT pg_size_pretty(pg_relation_size('users'));

-- 查看索引大小
SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass))
FROM pg_indexes WHERE tablename = 'users';

-- 查看最大的表
SELECT
    relname,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    pg_size_pretty(pg_indexes_size(relid)) AS index_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;
```

## 7. 页面内部结构详解

每个页面（默认 8KB）的布局：

| 偏移 | 内容 | 大小 |
|------|------|------|
| 0-23 | PageHeaderData | 24 字节 |
| 24-... | ItemIdData（行指针数组） | 每个 4 字节 |
| ... | Free Space | 可变 |
| ...-8191 | Tuple Data（从页面末尾向前增长） | 可变 |

PageHeaderData 关键字段：
- `pd_lsn`：最后修改该页面的 WAL 记录的 LSN
- `pd_lower`：空闲空间的起始位置（行指针结束）
- `pd_upper`：空闲空间的结束位置（Tuple 数据开始）
- `pd_special`：特殊空间的起始位置（索引页使用）
