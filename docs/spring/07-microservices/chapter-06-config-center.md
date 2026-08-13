# 配置中心

## 1. Nacos Config

```yaml
spring:
  cloud:
    nacos:
      config:
        server-addr: localhost:8848
        namespace: dev
        group: DEFAULT_GROUP
        file-extension: yaml
```

## 2. 动态刷新

```java
@RefreshScope
@Configuration
public class DynamicConfig {
    @Value("${app.feature.enabled}")
    private boolean featureEnabled;
}
```

## 3. 配置优先级

Nacos > application-{profile}.yml > application.yml > bootstrap.yml

## 4. 配置中心高级用法

### 4.1 多环境配置管理

```yaml
# Nacos 配置：order-service.yml（dev 命名空间）
server:
  port: 8081

spring:
  datasource:
    url: jdbc:mysql://dev-db:3306/order_dev
    username: dev
    password: ${DB_PASSWORD:dev123}

order:
  timeout: 30
  max-retry: 3
  page-size: 20
  feature:
    new-checkout: true
    recommend-algorithm: v2
```

```yaml
# Nacos 配置：order-service.yml（prod 命名空间）
server:
  port: 8081

spring:
  datasource:
    url: jdbc:mysql://prod-db:3306/order_prod
    username: ${DB_USER}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 20

order:
  timeout: 10
  max-retry: 1
  page-size: 50
  feature:
    new-checkout: false
    recommend-algorithm: v1
```

### 4.2 共享配置

```yaml
# bootstrap.yml
spring:
  application:
    name: order-service
  cloud:
    nacos:
      config:
        server-addr: nacos-server:8848
        namespace: ${SPRING_PROFILES_ACTIVE:dev}
        group: DEFAULT_GROUP
        file-extension: yml
        # 共享配置（多个服务共用的配置）
        shared-configs:
          - data-id: common-datasource.yml
            group: SHARED_GROUP
            refresh: true
          - data-id: common-redis.yml
            group: SHARED_GROUP
            refresh: true
          - data-id: common-kafka.yml
            group: SHARED_GROUP
            refresh: false
```

### 4.3 配置加密（Nacos AES）

```yaml
# Nacos Server 端配置
# application.properties
nacos.core.auth.plugin.nacos.token.secret.key=your-secret-key

# 自定义加密配置值
spring:
  datasource:
    password: '{cipher}AQIjM0NjZ...加密后的密文...'
```

### 4.4 配置变更监听

```java
@Component
public class ConfigChangeListener {

    @Autowired
    private NacosConfigManager nacosConfigManager;

    @PostConstruct
    public void init() throws NacosException {
        // 监听配置变更
        nacosConfigManager.getConfigService()
            .addListener("order-service.yml", "DEFAULT_GROUP",
                new Listener() {
                    @Override
                    public Executor getExecutor() {
                        return null;  // 使用默认线程
                    }

                    @Override
                    public void receiveConfigInfo(String configInfo) {
                        log.info("配置变更: {}", configInfo);
                        // 执行配置变更后的逻辑
                        refreshCache();
                    }
                });
    }
}
```

### 4.5 配置灰度发布

```java
// 灰度配置：只对部分实例生效
@RefreshScope
@Configuration
public class GrayConfig {

    @Value("${feature.gray.enabled:false}")
    private boolean grayEnabled;

    @Value("${feature.gray.ratio:0}")
    private int grayRatio;  // 灰度比例 0-100

    public boolean shouldGray(String userId) {
        if (!grayEnabled) return false;
        // 根据用户 ID 哈希决定是否灰度
        return Math.abs(userId.hashCode() % 100) < grayRatio;
    }
}
```

### 4.6 Apollo vs Nacos 对比

| 特性 | Nacos | Apollo |
|------|-------|--------|
| 出品方 | 阿里巴巴 | 携程 |
| 配置变更推送 | 长轮询（准实时） | 推送 + 长轮询（实时）
| 配置回滚 | ✅ | ✅ |
| 灰度发布 | ✅（IP 级） | ✅（集群级） |
| 权限管理 | 基础 | 完善（审批流程） |
| 多环境 | Namespace | Env（独立部署） |
| 服务发现 | ✅ 内置 | ❌ |
| 国内生态 | ★★★★★ | ★★★★ |

**最佳实践：**

1. **配置分离**——业务配置用 Nacos，基础设施配置用 K8s ConfigMap/Secret
2. **敏感信息加密**——密码、密钥等不要明文存储在配置中心
3. **配置变更要有审批**——生产环境配置变更必须经过审核
4. **`@RefreshScope` 慎用**——Bean 重建可能影响有状态的组件
5. **配置降级**——配置中心不可用时，应用应能使用本地缓存的配置启动
