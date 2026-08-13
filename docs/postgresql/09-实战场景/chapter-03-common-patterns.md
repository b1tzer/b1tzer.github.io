# 常见业务场景

## 1. 审计日志

```sql
-- 使用触发器记录变更
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT,
    operation TEXT,
    old_data JSONB,
    new_data JSONB,
    changed_at TIMESTAMP DEFAULT NOW()
);
```

## 2. 时序数据

```sql
-- 使用 TimescaleDB
CREATE EXTENSION timescaledb;
SELECT create_hypertable('metrics', 'time');
```

## 3. 多租户

```sql
-- 方案1：行级隔离
ALTER TABLE orders ADD COLUMN tenant_id INT;
CREATE POLICY tenant_policy ON orders USING (tenant_id = current_tenant_id());

-- 方案2：Schema 隔离
CREATE SCHEMA tenant_1;
CREATE TABLE tenant_1.orders (...);
```

---
*待补充：更多业务场景*
