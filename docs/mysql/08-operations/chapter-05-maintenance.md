# 日常维护

## 1. OPTIMIZE TABLE

```sql
-- 整理碎片
OPTIMIZE TABLE users;
```

## 2. ANALYZE TABLE

```sql
-- 更新统计信息
ANALYZE TABLE users;
```

## 3. CHECK TABLE

```sql
-- 检查表完整性
CHECK TABLE users;
```

## 4. 表空间管理

```sql
-- 查看表大小
SELECT 
    table_name,
    ROUND(data_length / 1024 / 1024, 2) AS data_mb,
    ROUND(index_length / 1024 / 1024, 2) AS index_mb,
    ROUND((data_length + index_length) / 1024 / 1024, 2) AS total_mb
FROM information_schema.tables
WHERE table_schema = 'mydb'
ORDER BY total_mb DESC;
```

## 5. 清理历史数据

```sql
-- 删除 30 天前的数据
DELETE FROM logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- 分批删除
DELETE FROM logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY) LIMIT 10000;
```

---
*待补充：更多维护场景*
