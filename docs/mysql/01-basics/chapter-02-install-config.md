# 安装部署与配置

## 1. 安装方式

### Docker
```bash
docker run -d --name mysql8 \
  -e MYSQL_ROOT_PASSWORD=secret \
  -p 3306:3306 \
  mysql:8.0
```

### apt/yum
```bash
# Ubuntu
apt install mysql-server-8.0

# CentOS
yum install mysql-community-server
```

## 2. 核心配置 (my.cnf)

```ini
[mysqld]
# 基础
port = 3306
datadir = /var/lib/mysql
socket = /var/run/mysqld/mysqld.sock

# 字符集
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# InnoDB
innodb_buffer_pool_size = 4G          # 物理内存的 70%
innodb_log_file_size = 1G
innodb_flush_log_at_trx_commit = 1    # 1=每次提交刷盘
innodb_flush_method = O_DIRECT

# 连接
max_connections = 500
wait_timeout = 600

# 慢查询
slow_query_log = 1
long_query_time = 1
```

## 3. 字符集

```sql
-- 查看字符集
SHOW CHARACTER SET;

-- 设置数据库字符集
CREATE DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---
*待补充：更多配置参数*
