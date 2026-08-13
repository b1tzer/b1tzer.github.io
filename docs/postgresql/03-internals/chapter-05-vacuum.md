# VACUUM 机制

## 1. 为什么需要 VACUUM

- 清理死元组（被 DELETE 或 UPDATE 产生的旧版本）
- 回收空间供复用
- 防止事务ID回卷（XID Wraparound）

## 2. VACUUM 类型

```sql
-- 标准 VACUUM（不锁表）
VACUUM users;

-- VACUUM FULL（锁表，重写表）
VACUUM FULL users;

-- 分析统计信息
ANALYZE users;
```

## 3. Autovacuum 配置

```conf
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 1min
autovacuum_vacuum_threshold = 50
autovacuum_vacuum_scale_factor = 0.2
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.1
```

## 4. 事务ID回卷

```sql
-- 查看事务ID年龄
SELECT datname, age(datfrozenxid) FROM pg_database;

-- 手动冻结
VACUUM FREEZE users;
```

---
*待补充：更多 VACUUM 调优*
