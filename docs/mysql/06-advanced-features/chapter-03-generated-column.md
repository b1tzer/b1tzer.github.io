# 生成列与函数索引

## 1. 生成列

```sql
CREATE TABLE products (
    id INT PRIMARY KEY,
    price DECIMAL(10,2),
    quantity INT,
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (price * quantity) STORED
);
```

## 2. 函数索引 (8.0+)

```sql
-- 对函数结果建索引
CREATE INDEX idx_upper_name ON users((UPPER(name)));
CREATE INDEX idx_year ON orders((YEAR(created_at)));

-- 使用
SELECT * FROM users WHERE UPPER(name) = 'ZHANGSAN';
SELECT * FROM orders WHERE YEAR(created_at) = 2024;
```

## 3. 应用场景

- 不区分大小写查询
- 按年/月查询
- 计算字段索引

---
*待补充：更多生成列场景*
