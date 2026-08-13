# Binlog

## 1. 作用

- 主从复制
- 数据恢复（Point-in-Time Recovery）

## 2. 格式

```ini
binlog_format = ROW
-- STATEMENT: 记录 SQL 语句（不推荐）
-- ROW: 记录行变更（推荐）
-- MIXED: 混合模式
```

## 3. 两阶段提交

```
1. InnoDB prepare（写 Redo Log）
2. Binlog write（写 Binlog）
3. InnoDB commit（标记提交）
```

## 4. 查看 Binlog

```sql
-- 查看 Binlog 列表
SHOW BINARY LOGS;

-- 查看 Binlog 内容
SHOW BINLOG EVENTS IN 'binlog.000001';

-- mysqlbinlog 工具
mysqlbinlog --base64-output=DECODE-ROWS -v binlog.000001
```

---
*待补充：更多 Binlog 细节*
