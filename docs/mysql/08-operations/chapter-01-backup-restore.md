# 备份恢复

## 1. 逻辑备份

```bash
# 全库备份
mysqldump -h localhost -u root -p --all-databases > all.sql

# 单库备份
mysqldump -h localhost -u root -p mydb > mydb.sql

# 单表备份
mysqldump -h localhost -u root -p mydb users > users.sql

# 一致性备份（推荐）
mysqldump --single-transaction --routines --triggers --all-databases > all.sql

# 恢复
mysql -h localhost -u root -p < all.sql
```

## 2. 物理备份

```bash
# xtrabackup
xtrabackup --backup --target-dir=/backup/full

# 恢复
xtrabackup --prepare --target-dir=/backup/full
xtrabackup --copy-back --target-dir=/backup/full
```

## 3. PITR

```bash
# 基于 Binlog 恢复
mysqlbinlog --start-datetime="2024-01-01 12:00:00" \
            --stop-datetime="2024-01-01 13:00:00" \
            binlog.000001 | mysql -u root -p
```

---
*待补充：更多备份策略*
