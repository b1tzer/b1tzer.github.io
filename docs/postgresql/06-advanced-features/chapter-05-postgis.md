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
## 4. 更多 PostGIS 用法

### 4.1 空间数据类型

```sql
-- 点（Point）
INSERT INTO places (name, geom)
VALUES ('天安门', ST_SetSRID(ST_MakePoint(116.3975, 39.9087), 4326));

-- 线（LineString）
INSERT INTO roads (name, geom)
VALUES ('长安街', ST_SetSRID(
    ST_MakeLine(ARRAY[
        ST_MakePoint(116.35, 39.91),
        ST_MakePoint(116.45, 39.91)
    ]), 4326));

-- 面（Polygon）
INSERT INTO areas (name, geom)
VALUES ('故宫', ST_SetSRID(
    ST_MakePolygon(ST_MakeLine(ARRAY[
        ST_MakePoint(116.39, 39.92),
        ST_MakePoint(116.40, 39.92),
        ST_MakePoint(116.40, 39.91),
        ST_MakePoint(116.39, 39.91),
        ST_MakePoint(116.39, 39.92)
    ])), 4326));
```

### 4.2 空间查询

```sql
-- 距离查询（单位：米，使用 geography 类型）
SELECT name,
    ST_Distance(
        geom::geography,
        ST_SetSRID(ST_MakePoint(116.4, 39.9), 4326)::geography
    ) AS distance_meters
FROM places
WHERE ST_DWithin(
    geom::geography,
    ST_SetSRID(ST_MakePoint(116.4, 39.9), 4326)::geography,
    5000  -- 5公里范围内
)
ORDER BY distance_meters;

-- 包含查询
SELECT name FROM areas
WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(116.395, 39.915), 4326));

-- 相交查询
SELECT name FROM roads
WHERE ST_Intersects(geom, ST_SetSRID(ST_MakePoint(116.4, 39.91), 4326));

-- 最近邻查询（KNN）
SELECT name,
    ST_Distance(geom::geography,
        ST_SetSRID(ST_MakePoint(116.4, 39.9), 4326)::geography) AS dist
FROM places
ORDER BY geom <-> ST_SetSRID(ST_MakePoint(116.4, 39.9), 4326)
LIMIT 5;
```

### 4.3 空间聚合

```sql
-- 计算凸包（ConvexHull）
SELECT ST_AsText(ST_ConvexHull(ST_Collect(geom))) FROM places;

-- 计算中心点
SELECT ST_AsText(ST_Centroid(ST_Collect(geom))) FROM places;

-- 按区域统计
SELECT
    a.name AS area_name,
    COUNT(p.id) AS place_count
FROM areas a
LEFT JOIN places p ON ST_Contains(a.geom, p.geom)
GROUP BY a.name;
```

### 4.4 坐标系转换

```sql
-- 转换坐标系（WGS84 → 火星坐标 GCJ-02）
-- 注意：实际转换需要自定义函数或使用第三方库

-- 查看当前 SRID
SELECT ST_SRID(geom) FROM places LIMIT 1;

-- 转换 SRID
SELECT ST_Transform(geom, 3857) FROM places LIMIT 1;  -- 转为 Web Mercator
```

### 4.5 地理围栏

```sql
-- 创建地理围栏
CREATE TABLE geofences (
    id SERIAL PRIMARY KEY,
    name TEXT,
    geom GEOMETRY(Polygon, 4326)
);

INSERT INTO geofences (name, geom) VALUES
('CBD区域', ST_SetSRID(ST_MakePolygon(ST_GeomFromText(
    'POLYGON((116.40 39.90, 116.45 39.90, 116.45 39.95, 116.40 39.95, 116.40 39.90))'
)), 4326));

-- 判断点是否在围栏内
SELECT g.name
FROM geofences g
WHERE ST_Contains(g.geom, ST_SetSRID(ST_MakePoint(116.42, 39.92), 4326));
```

### 4.6 性能优化

```sql
-- 创建 GiST 索引
CREATE INDEX idx_places_geom ON places USING GIST (geom);

-- 创建 SP-GiST 索引（适合大量点数据）
CREATE INDEX idx_places_spgist ON places USING SPGIST (geom);

-- 分析空间查询计划
EXPLAIN ANALYZE
SELECT name FROM places
WHERE ST_DWithin(geom::geography,
    ST_SetSRID(ST_MakePoint(116.4, 39.9), 4326)::geography, 1000);
```
