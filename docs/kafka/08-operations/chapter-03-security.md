# 安全

## 1. 认证 (SASL)

```properties
# SASL/PLAIN
sasl.mechanism.inter.broker.protocol=PLAIN
sasl.enabled.mechanisms=PLAIN

# SASL/SCRAM
sasl.mechanism.inter.broker.protocol=SCRAM-SHA-256
sasl.enabled.mechanisms=SCRAM-SHA-256
```

## 2. 授权 (ACL)

```bash
# 添加 ACL
kafka-acls.sh --add --allow-principal User:alice --operation Read --topic my-topic --bootstrap-server localhost:9092

# 查看 ACL
kafka-acls.sh --list --topic my-topic --bootstrap-server localhost:9092
```

## 3. 加密 (SSL)

```properties
ssl.keystore.location=/path/to/kafka.server.keystore.jks
ssl.keystore.password=***
ssl.truststore.location=/path/to/kafka.server.truststore.jks
ssl.truststore.password=***
```

## 4. 配置示例

```properties
# 安全配置
security.protocol=SASL_SSL
sasl.mechanism=SCRAM-SHA-256
```

---
*待补充：更多安全细节*
