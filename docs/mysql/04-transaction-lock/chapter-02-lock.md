# 锁机制

## 1. 锁类型

| 锁 | 粒度 | 说明 |
|----|------|------|
| 全局锁 | 库 | FTWRL，全库只读 |
| 表锁 | 表 | LOCK TABLES t WRITE/READ |
| 元数据锁 | 表 | DML 自动加，DDL 冲突 |
| 行锁 | 行 | InnoDB 特有 |

## 2. 行锁类型

| 锁 | 说明 |
|----|------|
| Record Lock | 锁定索引记录 |
| Gap Lock | 锁定索引记录之间的间隙 |
| Next-Key Lock | Record Lock + Gap Lock（默认） |
| Insert Intention Lock | 插入意向锁 |

## 3. 加锁规则

```sql
-- 等值查询唯一索引，命中 → Record Lock
-- 等值查询唯一索引，未命中 → Gap Lock
-- 等值查询非唯一索引 → Next-Key Lock + Gap Lock
-- 范围查询 → Next-Key Lock
```

## 4. 查看锁

```sql
-- 查看锁等待
SELECT * FROM performance_schema.data_lock_waits;

-- 查看锁信息
SELECT * FROM performance_schema.data_locks;

-- 杀死阻塞
KILL <thread_id>;
```

---
*待补充：更多锁场景*
