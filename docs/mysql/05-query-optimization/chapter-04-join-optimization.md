# 连接优化

## 1. 连接算法

| 算法 | 说明 | 适用场景 |
|------|------|---------|
| Nested Loop Join | 嵌套循环 | 小表驱动大表 |
| Block Nested Loop | 块嵌套循环 | 无索引连接 |
| Hash Join | 哈希连接 | 8.0+ 等值连接 |

## 2. 优化原则

```sql
-- 小表驱动大表
SELECT * FROM orders o 
JOIN users u ON o.user_id = u.id  -- users 是小表
WHERE u.status = 'active';

-- 被驱动表连接字段加索引
CREATE INDEX idx_user_id ON orders(user_id);
```

## 3. JOIN 优化

```sql
-- 使用 EXPLAIN 查看驱动表
EXPLAIN SELECT * FROM orders o JOIN users u ON o.user_id = u.id;

-- 确保被驱动表有索引
-- 确保小表驱动大表
```

---
*待补充：更多连接优化场景*
