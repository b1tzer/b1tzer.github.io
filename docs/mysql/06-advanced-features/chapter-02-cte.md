# CTE 与递归查询

## 1. 普通 CTE

```sql
WITH active_users AS (
    SELECT id, name FROM users WHERE status = 'active'
)
SELECT * FROM active_users WHERE name LIKE '张%';
```

## 2. 递归 CTE

```sql
WITH RECURSIVE org_tree AS (
    -- 锚点：顶级部门
    SELECT id, name, parent_id, 1 AS level
    FROM departments WHERE parent_id IS NULL
    
    UNION ALL
    
    -- 递归：子部门
    SELECT d.id, d.name, d.parent_id, t.level + 1
    FROM departments d
    JOIN org_tree t ON d.parent_id = t.id
)
SELECT * FROM org_tree ORDER BY level, id;
```

## 3. 应用场景

- 组织架构树
- 评论回复层级
- 分类目录
- 路径展开

---
*待补充：更多 CTE 场景*
