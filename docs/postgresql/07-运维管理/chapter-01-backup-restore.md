# 备份恢复

## 1. 逻辑备份

```bash
# 单库备份
pg_dump -h localhost -U postgres -d mydb > mydb.sql

# 单表备份
pg_dump -h localhost -U postgres -d mydb -t users > users.sql

# 自定义格式（支持并行恢复）
pg_dump -h localhost -U postgres -d mydb -Fc > mydb.dump

# 恢复
psql -h localhost -U postgres -d mydb < mydb.sql
pg_restore -h localhost -U postgres -d mydb mydb.dump
```

## 2. 物理备份

```bash
# 基础备份
pg_basebackup -h localhost -U replicator -D /backup/base -Fp -Xs -P
```

## 3. PITR 时间点恢复

```conf
# postgresql.conf
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2024-01-01 12:00:00'
```

---
*待补充：更多备份策略*
