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
## 4. 备份策略详解

### 4.1 逻辑备份高级用法

```bash
# 并行备份（-j 指定并行数）
pg_dump -h localhost -U postgres -d mydb -Fc -j 4 -f mydb.dump

# 并行恢复
pg_restore -h localhost -U postgres -d mydb -j 4 mydb.dump

# 只备份表结构
pg_dump -h localhost -U postgres -d mydb --schema-only > schema.sql

# 只备份数据
pg_dump -h localhost -U postgres -d mydb --data-only > data.sql

# 排除特定表
pg_dump -h localhost -U postgres -d mydb -T logs -T temp_data > mydb.sql

# 只备份特定 schema
pg_dump -h localhost -U postgres -d mydb -n public > public_schema.sql

# 压缩备份
pg_dump -h localhost -U postgres -d mydb -Fc -Z 9 > mydb.dump

# 备份全局对象（角色、表空间）
pg_dumpall -h localhost -U postgres --globals-only > globals.sql
```

### 4.2 物理备份与 PITR

```bash
# 基础备份
pg_basebackup -h localhost -U replicator -D /backup/base -Fp -Xs -P -R

# -R 自动生成 standby.signal 和 primary_conninfo
# -Xs 使用流复制传输 WAL
# -P 显示进度

# 压缩备份（PG 13+）
pg_basebackup -h localhost -U replicator -D /backup/base -Ft -z -P
```

```conf
# postgresql.conf - 启用归档
archive_mode = on
archive_command = 'cp %p /archive/%f'
```

```bash
# PITR 恢复步骤
# 1. 停止数据库
systemctl stop postgresql

# 2. 恢复基础备份
cp -r /backup/base/* /var/lib/postgresql/16/main/

# 3. 创建恢复配置
cat > /var/lib/postgresql/16/main/postgresql.auto.conf << EOF
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2024-06-15 12:00:00'
recovery_target_action = 'promote'
EOF

# 4. 创建恢复信号文件
touch /var/lib/postgresql/16/main/recovery.signal

# 5. 启动数据库
systemctl start postgresql
```

### 4.3 增量备份（PG 17+）

```bash
# PG 17 支持增量备份
pg_basebackup -h localhost -U replicator -D /backup/inc1 --incremental

# 合并增量备份
pg_combinebackup /backup/base /backup/inc1 -D /backup/merged
```

### 4.4 备份验证

```bash
# 验证备份完整性
pg_restore -l mydb.dump  # 列出备份内容

# 测试恢复到临时实例
docker run -d --name pg_test -e POSTGRES_PASSWORD=secret postgres:16
pg_restore -h localhost -p 5433 -U postgres -d testdb mydb.dump

# 检查数据一致性
psql -h localhost -U postgres -d testdb -c "SELECT count(*) FROM users;"
```

### 4.5 备份脚本示例

```bash
#!/bin/bash
# 每日备份脚本
BACKUP_DIR=/backup/postgresql
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# 执行备份
pg_dump -h localhost -U postgres -d mydb -Fc -f ${BACKUP_DIR}/mydb_${DATE}.dump

# 删除过期备份
find ${BACKUP_DIR} -name '*.dump' -mtime +${RETENTION_DAYS} -delete

# 记录日志
echo "$(date): Backup completed: mydb_${DATE}.dump" >> ${BACKUP_DIR}/backup.log
```

### 4.6 备份策略选择

| 策略 | 适用场景 | RPO | RTO | 工具 |
|------|---------|-----|-----|------|
| 每日逻辑备份 | 小型数据库（< 100GB） | 24小时 | 小时级 | pg_dump |
| 每周全量 + 每日增量 | 中型数据库 | 24小时 | 分钟级 | pg_basebackup |
| 流复制 + WAL 归档 | 大型数据库，高可用 | 秒级 | 秒级 | 流复制 |
| 连续归档 | 金融级，任意时间点恢复 | 秒级 | 分钟级 | WAL 归档 |
