# 安装部署与配置

## 1. 安装方式

### Docker
```bash
docker run -d --name es \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  -p 9200:9200 -p 9300:9300 \
  elasticsearch:8.12.0
```

### apt/yum
```bash
# Debian/Ubuntu
apt install elasticsearch

# RHEL/CentOS
yum install elasticsearch
```

## 2. 核心配置 (elasticsearch.yml)

```yaml
cluster.name: my-cluster
node.name: node-1
network.host: 0.0.0.0
http.port: 9200

# 集群发现
discovery.seed_hosts: ["node-1", "node-2", "node-3"]
cluster.initial_master_nodes: ["node-1", "node-2", "node-3"]

# 路径
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch

# 内存
bootstrap.memory_lock: true
```

## 3. JVM 配置 (jvm.options)

```ini
-Xms4g
-Xmx4g
```

建议：堆内存不超过物理内存的 50%，不超过 32GB。

---
*待补充：更多配置参数*
