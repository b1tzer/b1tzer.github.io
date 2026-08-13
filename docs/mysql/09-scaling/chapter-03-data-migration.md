# 数据迁移

## 1. mysqldump

```bash
# 从源库导出
mysqldump -h source -u root -p --single-transaction mydb > mydb.sql

# 导入目标库
mysql -h target -u root -p mydb < mydb.sql
```

## 2. mydumper

```bash
# 并行导出
mydumper -h source -u root -p secret -B mydb -t 8 -o /backup/

# 并行导入
myloader -h target -u root -p secret -B mydb -t 8 -d /backup/
```

## 3. DM (Data Migration)

TiDB 生态的迁移工具。

```yaml
# dm-task.yaml
name: mydb-migration
task-mode: all
target-database:
  host: target
  port: 3306
  user: root
  password: "secret"
mysql-instances:
  - source-id: source1
    black-white-list: mydb-list
```

---
*待补充：更多迁移场景*
