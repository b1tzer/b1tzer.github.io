# 迁移

## 1. 版本升级

```bash
# 停止服务
systemctl stop postgresql

# 使用 pg_upgrade
/usr/pgsql-16/bin/pg_upgrade \
    -d /var/lib/postgresql/15/main \
    -D /var/lib/postgresql/16/main \
    -b /usr/pgsql-15/bin \
    -B /usr/pgsql-16/bin
```

## 2. 数据迁移工具

| 工具 | 说明 |
|------|------|
| pgLoader | 从 MySQL/SQL Server/CSV 迁移 |
| ora2pg | 从 Oracle 迁移 |
| pg_dump/pg_restore | PG 之间迁移 |

## 3. pgLoader 示例

```sql
LOAD DATABASE
    FROM mysql://user:pass@mysql-host/mydb
    INTO postgresql://user:pass@pg-host/mydb;
```

---
*待补充：更多迁移场景*
