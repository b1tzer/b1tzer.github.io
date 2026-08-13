# 异步复制与半同步复制

## 1. 异步复制

```ini
# 主库
server-id = 1
log-bin = mysql-bin
binlog_format = ROW

# 从库
server-id = 2
relay-log = relay-bin
read_only = ON
```

```sql
-- 从库配置
CHANGE MASTER TO
    MASTER_HOST='192.168.1.100',
    MASTER_USER='repl',
    MASTER_PASSWORD='secret',
    MASTER_AUTO_POSITION=1;

START SLAVE;
SHOW SLAVE STATUS\G
```

## 2. 半同步复制

```sql
-- 主库
INSTALL PLUGIN rpl_semi_sync_master SONAME 'semisync_master.so';
SET GLOBAL rpl_semi_sync_master_enabled = 1;

-- 从库
INSTALL PLUGIN rpl_semi_sync_slave SONAME 'semisync_slave.so';
SET GLOBAL rpl_semi_sync_slave_enabled = 1;
```

## 3. 延迟问题

```sql
-- 查看从库延迟
SHOW SLAVE STATUS\G
-- Seconds_Behind_Master
```

---
*待补充：更多复制细节*
