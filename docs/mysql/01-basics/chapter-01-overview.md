# MySQL 概览

## 1. 什么是 MySQL

MySQL 是最流行的开源关系型数据库管理系统，由 Oracle 维护。

## 2. 版本选择

| 版本 | 特性 | 推荐 |
|------|------|------|
| 5.7 | 稳定，JSON 支持 | 老项目 |
| 8.0 | 窗口函数、CTE、JSON 增强 | 推荐 |
| 8.4 | LTS 版本，性能优化 | 新项目 |

## 3. 与 PostgreSQL/Oracle 对比

| 特性 | MySQL | PostgreSQL | Oracle |
|------|-------|-----------|--------|
| 开源 | ✅ | ✅ | ❌ |
| 事务 | InnoDB 支持 | 原生支持 | 原生支持 |
| JSON | 8.0+ 增强 | JSONB 原生 | 支持 |
| 复制 | 主从/GTID/MGR | 流复制/逻辑复制 | Data Guard |
| 适用场景 | 互联网/高并发 | 企业级/复杂查询 | 金融/电信 |

## 4. 存储引擎

```sql
-- 查看支持的存储引擎
SHOW ENGINES;

-- 常用引擎
-- InnoDB: 事务、行锁、外键（默认）
-- MyISAM: 不支持事务、表锁（已过时）
-- Memory: 内存表、重启丢失
```

## 5. MySQL 发展历史

| 时间 | 事件 |
|------|------|
| 1995 | MySQL 1.0 发布，由 Michael Widenius 和 David Axmark 创建 |
| 2000 | MySQL 采用 GPL 开源协议 |
| 2008 | Sun Microsystems 以 10 亿美元收购 MySQL AB |
| 2010 | Oracle 收购 Sun，获得 MySQL |
| 2016 | MySQL 8.0 开发分支发布 |
| 2018 | MySQL 8.0 GA 正式发布 |
| 2024 | MySQL 8.4 LTS 版本发布 |

## 6. 适用场景

**适合使用 MySQL 的场景：**
- 互联网 Web 应用（读多写少）
- OLTP 联机事务处理
- 中小规模数据量（单表千万级以内）
- 高并发读写（InnoDB 行锁）
- 需要主从复制、读写分离的架构

**不太适合的场景：**
- 复杂的分析查询（OLAP）→ 考虑 ClickHouse、TiDB
- 海量数据存储 → 考虑分布式数据库
- 强一致性多写场景 → 考虑 CockroachDB

## 7. MySQL 8.0 核心新特性

```sql
-- 1. 窗口函数
SELECT name, salary,
    ROW_NUMBER() OVER (ORDER BY salary DESC) AS ranking
FROM employees;

-- 2. CTE (Common Table Expression)
WITH dept_stats AS (
    SELECT department_id, AVG(salary) AS avg_salary
    FROM employees GROUP BY department_id
)
SELECT * FROM dept_stats WHERE avg_salary > 10000;

-- 3. JSON 增强
SELECT JSON_OBJECT('name', name, 'salary', salary) FROM employees LIMIT 5;

-- 4. 不可见索引（测试索引删除影响）
ALTER TABLE employees ALTER INDEX idx_name INVISIBLE;
-- 确认无影响后删除
ALTER TABLE employees ALTER INDEX idx_name VISIBLE;

-- 5. 原子 DDL
DROP TABLE IF EXISTS t1, t2;  -- 要么全成功，要么全失败
```

## 8. 最佳实践

1. **生产环境始终使用 InnoDB** — MyISAM 已过时，不支持事务和行锁
2. **统一使用 utf8mb4** — utf8 只支持 3 字节，无法存储 emoji
3. **主键选择 BIGINT AUTO_INCREMENT** — 避免 UUID 作为主键（随机写入导致页分裂）
4. **及时升级到 8.0+** — 5.7 已于 2023 年 10 月停止官方支持
5. **关注 LTS 版本** — 8.4 为长期支持版本，适合生产环境

---
