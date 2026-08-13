# 读写分离

## 1. ProxySQL

```ini
# proxysql.cnf
mysql_variables:
    threads=4
    max_connections=2048

mysql_servers:
    - address: 192.168.1.100
      port: 3306
      hostgroup: 10  # 写组
    - address: 192.168.1.101
      port: 3306
      hostgroup: 20  # 读组
    - address: 192.168.1.102
      port: 3306
      hostgroup: 20  # 读组

mysql_query_rules:
    - match_pattern: "^SELECT"
      destination_hostgroup: 20
      apply: 1
```

## 2. MySQL Router

```bash
mysqlrouter --bootstrap root@192.168.1.100:3306 --user=mysql
systemctl start mysqlrouter
```

## 3. Spring Boot 配置

```yaml
spring:
  datasource:
    write:
      url: jdbc:mysql://192.168.1.100:3306/mydb
    read:
      url: jdbc:mysql://192.168.1.101:3306/mydb
```

---
*待补充：更多读写分离场景*
