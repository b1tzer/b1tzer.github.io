# 安装部署与配置

## 1. 安装方式

### Debian/Ubuntu
```bash
sudo apt install postgresql-16 postgresql-contrib-16
```

### RHEL/CentOS
```bash
sudo yum install postgresql16-server postgresql16-contrib
sudo /usr/pgsql-16/bin/postgresql-16-setup initdb
sudo systemctl enable postgresql-16
sudo systemctl start postgresql-16
```

### Docker
```bash
docker run -d --name pg16 \
  -e POSTGRES_PASSWORD=secret \
  -p 5432:5432 \
  postgres:16
```

## 2. 核心配置

```conf
# postgresql.conf
listen_addresses = '*'
max_connections = 200
shared_buffers = '4GB'              # 建议物理内存的 25%
effective_cache_size = '12GB'       # 建议物理内存的 75%
work_mem = '64MB'
maintenance_work_mem = '512MB'
wal_buffers = '64MB'
checkpoint_completion_target = 0.9
```

## 3. 目录结构

```
PGDATA/
├── base/          # 数据库文件
├── global/        # 集群共享数据
├── pg_wal/        # WAL 日志
├── pg_xact/       # 事务提交状态
├── pg_stat_tmp/   # 统计信息
└── postgresql.conf
```

---
*待补充：更多配置参数*
