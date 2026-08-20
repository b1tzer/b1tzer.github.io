# PL/pgSQL

## 1. 存储过程

```sql
CREATE OR REPLACE FUNCTION transfer(
    from_id INT, to_id INT, amount DECIMAL
) RETURNS VOID AS $$
BEGIN
    UPDATE accounts SET balance = balance - amount WHERE id = from_id;
    UPDATE accounts SET balance = balance + amount WHERE id = to_id;
END;
$$ LANGUAGE plpgsql;
```

## 2. 触发器

```sql
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
```

## 3. 游标

```sql
DECLARE
    cur CURSOR FOR SELECT * FROM users;
    rec RECORD;
BEGIN
    OPEN cur;
    LOOP
        FETCH cur INTO rec;
        EXIT WHEN NOT FOUND;
        -- 处理
    END LOOP;
    CLOSE cur;
END;
```
## 4. 更多 PL/pgSQL 用法

### 4.1 条件与循环

```sql
-- IF-ELSIF-ELSE
CREATE OR REPLACE FUNCTION classify_age(age INT)
RETURNS TEXT AS $$
BEGIN
    IF age < 18 THEN RETURN '未成年';
    ELSIF age < 60 THEN RETURN '成年';
    ELSE RETURN '老年';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- LOOP 循环
CREATE OR REPLACE FUNCTION factorial(n INT)
RETURNS BIGINT AS $$
DECLARE
    result BIGINT := 1;
    i INT := 1;
BEGIN
    LOOP
        result := result * i;
        i := i + 1;
        EXIT WHEN i > n;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- FOR 循环
CREATE OR REPLACE FUNCTION sum_range(start_val INT, end_val INT)
RETURNS BIGINT AS $$
DECLARE
    total BIGINT := 0;
BEGIN
    FOR i IN start_val..end_val LOOP
        total := total + i;
    END LOOP;
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- FOR-IN 查询循环
CREATE OR REPLACE FUNCTION get_high_salary_names()
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    rec RECORD;
BEGIN
    FOR rec IN SELECT name, salary FROM employees WHERE salary > 10000
    LOOP
        result := result || rec.name || '(' || rec.salary || '), ';
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### 4.2 异常处理

```sql
CREATE OR REPLACE FUNCTION safe_transfer(from_id INT, to_id INT, amount DECIMAL)
RETURNS TEXT AS $$
BEGIN
    UPDATE accounts SET balance = balance - amount WHERE id = from_id;
    IF NOT FOUND THEN
        RETURN '源账户不存在';
    END IF;

    UPDATE accounts SET balance = balance + amount WHERE id = to_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION '目标账户不存在';
    END IF;

    RETURN '转账成功';
EXCEPTION
    WHEN check_violation THEN
        RETURN '余额不足';
    WHEN OTHERS THEN
        RETURN '未知错误: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;
```

### 4.3 动态 SQL

```sql
CREATE OR REPLACE FUNCTION dynamic_query(table_name TEXT, column_name TEXT, value TEXT)
RETURNS SETOF RECORD AS $$
DECLARE
    query TEXT;
BEGIN
    query := format('SELECT * FROM %I WHERE %I = $1', table_name, column_name);
    RETURN QUERY EXECUTE query USING value;
END;
$$ LANGUAGE plpgsql;

-- 使用 EXECUTE 执行动态 SQL
CREATE OR REPLACE FUNCTION truncate_table(target_table TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('TRUNCATE TABLE %I', target_table);
END;
$$ LANGUAGE plpgsql;
```

### 4.4 高级触发器

```sql
-- 审计日志触发器
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, new_data, changed_at)
        VALUES (TG_TABLE_NAME, 'INSERT', to_jsonb(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, old_data, new_data, changed_at)
        VALUES (TG_TABLE_NAME, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, old_data, changed_at)
        VALUES (TG_TABLE_NAME, 'DELETE', to_jsonb(OLD), NOW());
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_audit
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_func();

-- 条件触发器（只在特定列变化时触发）
CREATE OR REPLACE FUNCTION notify_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.price IS DISTINCT FROM NEW.price THEN
        PERFORM pg_notify('price_change',
            json_build_object('id', NEW.id, 'old_price', OLD.price, 'new_price', NEW.price)::text);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4.5 存储过程（PG 11+）

```sql
-- 存储过程支持事务控制（函数不支持）
CREATE OR REPLACE PROCEDURE batch_process()
LANGUAGE plpgsql AS $$
DECLARE
    batch_size INT := 1000;
    processed INT;
BEGIN
    LOOP
        WITH batch AS (
            SELECT id FROM tasks WHERE status = 'pending' LIMIT batch_size
        )
        UPDATE tasks SET status = 'processing'
        WHERE id IN (SELECT id FROM batch);

        GET DIAGNOSTICS processed = ROW_COUNT;
        COMMIT;  -- 存储过程中可以 COMMIT

        EXIT WHEN processed = 0;
        RAISE NOTICE 'Processed % rows', processed;
    END LOOP;
END;
$$;

-- 调用存储过程
CALL batch_process();
```
