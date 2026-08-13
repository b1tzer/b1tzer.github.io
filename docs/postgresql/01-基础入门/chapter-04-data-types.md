# 数据类型

## 1. 数值类型

| 类型 | 存储 | 范围 |
|------|------|------|
| SMALLINT | 2字节 | -32768 ~ 32767 |
| INTEGER | 4字节 | -2147483648 ~ 2147483647 |
| BIGINT | 8字节 | 极大 |
| NUMERIC(p,s) | 可变 | 精确小数 |
| REAL | 4字节 | 6位精度 |
| DOUBLE PRECISION | 8字节 | 15位精度 |

## 2. 字符串类型

| 类型 | 说明 |
|------|------|
| VARCHAR(n) | 可变长度，有上限 |
| CHAR(n) | 固定长度 |
| TEXT | 无限长度 |

## 3. 日期时间类型

| 类型 | 说明 |
|------|------|
| TIMESTAMP | 日期时间 |
| TIMESTAMPTZ | 带时区 |
| DATE | 仅日期 |
| TIME | 仅时间 |
| INTERVAL | 时间间隔 |

## 4. 特殊类型

```sql
-- 数组
CREATE TABLE tags (id INT, names TEXT[]);
INSERT INTO tags VALUES (1, ARRAY['java', 'spring']);

-- 范围
SELECT * FROM events WHERE tsrange(start_time, end_time) @> NOW();

-- JSON/JSONB
CREATE TABLE docs (id INT, data JSONB);
```

---
*待补充：更多类型用法*
