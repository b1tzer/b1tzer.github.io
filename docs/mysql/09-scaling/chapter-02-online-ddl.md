# 在线 DDL

## 1. 原生 Online DDL

```sql
-- 8.0+ 支持
ALTER TABLE users ADD COLUMN age INT, ALGORITHM=INPLACE, LOCK=NONE;
```

## 2. pt-osc

```bash
# Percona Toolkit
pt-online-schema-change \
    --alter "ADD COLUMN age INT" \
    --execute \
    D=mydb,t=users
```

## 3. gh-ost

```bash
# GitHub
gh-ost \
    --database=mydb \
    --table=users \
    --alter="ADD COLUMN age INT" \
    --execute
```

## 4. 对比

| 工具 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| Online DDL | InnoDB 原生 | 无额外工具 | 大表仍慢 |
| pt-osc | 触发器复制 | 成熟稳定 | 触发器开销 |
| gh-ost | Binlog 流 | 无触发器 | 需要 Binlog |

---
*待补充：更多在线 DDL 场景*
