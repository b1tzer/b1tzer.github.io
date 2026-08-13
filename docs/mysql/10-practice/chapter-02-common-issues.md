# 常见问题与避坑指南

## 1. 索引失效

```sql
-- 函数操作
WHERE YEAR(created_at) = 2024  -- ❌

-- 隐式类型转换
WHERE phone = 13800138000  -- ❌ phone 是 VARCHAR

-- LIKE 左模糊
WHERE name LIKE '%张'  -- ❌
```

## 2. 死锁

```sql
-- 固定加锁顺序
-- 按主键顺序更新
UPDATE users SET name = 'A' WHERE id = 1;
UPDATE users SET name = 'A' WHERE id = 2;
```

## 3. 大事务

```sql
-- 拆分大事务
-- 慢
DELETE FROM logs WHERE created_at < '2024-01-01';

-- 快
DELETE FROM logs WHERE created_at < '2024-01-01' LIMIT 10000;
-- 循环执行直到影响行数为 0
```

## 4. 连接池耗尽

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
```

---
*待补充：更多避坑场景*
