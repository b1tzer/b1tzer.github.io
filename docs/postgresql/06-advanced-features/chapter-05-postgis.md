# PostGIS 空间数据

## 1. 安装

```sql
CREATE EXTENSION postgis;
```

## 2. 基本用法

```sql
-- 创建空间表
CREATE TABLE places (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    geom GEOMETRY(Point, 4326)
);

-- 插入
INSERT INTO places (name, geom) 
VALUES ('北京', ST_SetSRID(ST_MakePoint(116.4074, 39.9042), 4326));

-- 空间查询
SELECT name FROM places 
WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint(116.4, 39.9), 4326), 1000);
```

## 3. 空间索引

```sql
CREATE INDEX idx_places_geom ON places USING GIST (geom);
```

---
*待补充：更多 PostGIS 用法*
