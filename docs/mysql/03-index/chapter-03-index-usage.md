# 索引使用与失效

## 1. 索引失效场景

```sql
-- 函数操作
WHERE YEAR(created_at) = 2024  -- ❌ 失效
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'  -- ✅

-- 隐式类型转换
WHERE phone = 13800138000  -- ❌ phone 是 VARCHAR
WHERE phone = '13800138000'  -- ✅

-- LIKE 左模糊
WHERE name LIKE '%张'  -- ❌ 失效
WHERE name LIKE '张%'  -- ✅

-- OR 条件
WHERE a = 1 OR b = 2  -- ❌ 如果 b 没索引
WHERE a = 1 UNION SELECT * FROM users WHERE b = 2  -- ✅
```

## 2. EXPLAIN 解读

```sql
EXPLAIN SELECT * FROM users WHERE name = '张三';
```

| 字段 | 说明 |
|------|------|
| type | ALL(全表扫描) → index → range → ref → eq_ref → const |
| key | 实际使用的索引 |
| rows | 预估扫描行数 |
| Extra | Using index/Using where/Using temporary/Using filesort |

---
*待补充：更多索引失效场景*
