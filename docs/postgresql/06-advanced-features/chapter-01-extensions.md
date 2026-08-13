# 扩展机制

## 1. 使用扩展

```sql
-- 安装扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 查看已安装
SELECT * FROM pg_extension;

-- 卸载
DROP EXTENSION IF EXISTS "uuid-ossp";
```

## 2. 常用扩展

| 扩展 | 说明 |
|------|------|
| uuid-ossp | UUID 生成 |
| pg_trgm | 模糊搜索 |
| btree_gist | GiST 索引支持 |
| hstore | 键值对 |
| pg_stat_statements | 查询统计 |
| postgis | 空间数据 |
| timescaledb | 时序数据 |
| pgvector | 向量搜索 |

---
*待补充：更多扩展用法*
