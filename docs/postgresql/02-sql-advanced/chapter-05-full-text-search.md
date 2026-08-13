# 全文搜索

## 1. 基本用法

```sql
-- 创建 tsvector
SELECT to_tsvector('english', 'The quick brown fox jumps over the lazy dog');

-- 查询
SELECT * FROM articles 
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'quick & fox');
```

## 2. 中文分词

```sql
-- 安装 zhparser
CREATE EXTENSION zhparser;
CREATE TEXT SEARCH CONFIGURATION chinese (PARSER = zhparser);
ALTER TEXT SEARCH CONFIGURATION chinese ADD MAPPING FOR n,v,a,i,e,l WITH simple;

-- 使用
SELECT * FROM articles 
WHERE to_tsvector('chinese', content) @@ to_tsquery('chinese', '数据库');
```

## 3. GIN 索引

```sql
CREATE INDEX idx_articles_fts ON articles USING GIN (to_tsvector('english', content));
```

---
*待补充：更多全文搜索场景*
