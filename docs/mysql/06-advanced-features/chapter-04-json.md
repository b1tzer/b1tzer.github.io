# JSON 类型

## 1. 基本操作

```sql
CREATE TABLE docs (
    id INT PRIMARY KEY,
    data JSON
);

INSERT INTO docs VALUES (1, '{"name": "张三", "age": 25}');

-- 提取
SELECT JSON_EXTRACT(data, '$.name') FROM docs;
SELECT data->>'$.name' FROM docs;  -- 返回字符串

-- 修改
UPDATE docs SET data = JSON_SET(data, '$.email', 'zhangsan@example.com') WHERE id = 1;
```

## 2. JSON 函数

| 函数 | 说明 |
|------|------|
| JSON_EXTRACT | 提取值 |
| JSON_SET | 设置值 |
| JSON_INSERT | 插入值 |
| JSON_REMOVE | 删除值 |
| JSON_CONTAINS | 包含检查 |
| JSON_ARRAY | 创建数组 |
| JSON_OBJECT | 创建对象 |

## 3. JSON 索引

```sql
-- 虚拟列 + 索引
ALTER TABLE docs ADD COLUMN name VARCHAR(50) AS (JSON_UNQUOTE(JSON_EXTRACT(data, '$.name')));
CREATE INDEX idx_name ON docs(name);
```

---
*待补充：更多 JSON 场景*
