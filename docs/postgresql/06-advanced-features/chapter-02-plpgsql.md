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

---
*待补充：更多 PL/pgSQL 用法*
