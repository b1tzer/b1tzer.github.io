# 外部化配置

## 1. 配置优先级

命令行参数 > 系统环境变量 > application-{profile}.yml > application.yml > @PropertySource

## 2. 多环境 Profile

```yaml
# application.yml
spring:
  profiles:
    active: dev

# application-dev.yml
server:
  port: 8080

# application-prod.yml
server:
  port: 80
```

## 3. 配置加密

```java
@Configuration
public class EncryptConfig {
    @Bean
    public EnvironmentPostProcessor environmentPostProcessor() {
        return new EncryptEnvironmentPostProcessor();
    }
}
```

## 4. 配置绑定

```java
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private String name;
    private List<String> servers;
    // getters/setters
}
```

## 5. 配置高级场景

### 5.1 配置加密（Jasypt）

```xml
<dependency>
    <groupId>com.github.ulisesbocchio</groupId>
    <artifactId>jasypt-spring-boot-starter</artifactId>
    <version>3.0.5</version>
</dependency>
```

```yaml
# application.yml
jasypt:
  encryptor:
    password: ${JASYPT_PASSWORD}  # 加密密钥通过环境变量传入
    algorithm: PBEWithMD5AndDES

spring:
  datasource:
    password: ENC(加密后的密文)
    # 通过命令行生成密文：
    # java -cp jasypt-1.9.3.jar org.jasypt.intf.cli.JasyptPBEStringEncryptionCLI \n
#     input="yourPassword" password="secretKey" algorithm=PBEWithMD5AndDES
```

### 5.2 配置继承与覆盖

```text
配置加载顺序（高优先级覆盖低优先级）：
1. 命令行参数        --server.port=9090
2. 系统环境变量       SERVER_PORT=9090
3. application-{profile}.yml
4. application.yml
5. @PropertySource
6. 默认值

实际应用：
application.yml        → 公共配置（端口、应用名）
application-dev.yml    → 开发环境（H2 数据库、DEBUG 日志）
application-prod.yml   → 生产环境（MySQL、WARN 日志）
```

### 5.3 配置导入

```yaml
# application.yml
spring:
  config:
    import:
      - classpath:common-datasource.yml
      - optional:classpath:local-config.yml  # optional 表示文件不存在也不报错
      - file:./external-config.yml           # 外部文件
```

### 5.4 自定义配置源

```java
public class DatabasePropertySource extends PropertySource<DataSource> {

    public DatabasePropertySource(DataSource dataSource) {
        super("databasePropertySource", dataSource);
    }

    @Override
    public Object getProperty(String name) {
        // 从数据库查询配置
        try (Connection conn = source.getConnection()) {
            PreparedStatement ps = conn.prepareStatement(
                "SELECT config_value FROM sys_config WHERE config_key = ?");
            ps.setString(1, name);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return rs.getString("config_value");
            }
        } catch (SQLException e) {
            // ignore
        }
        return null;
    }
}

// 注册自定义配置源
public class DatabaseEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment,
            SpringApplication application) {
        DataSource ds = createDataSource();
        environment.getPropertySources()
            .addLast(new DatabasePropertySource(ds));
    }
}
```

### 5.5 配置绑定到 Record

```java
// Java 16+ Record 类型安全绑定
@ConfigurationProperties(prefix = "app.cache")
public record CacheProperties(
    int maxSize,
    Duration ttl,
    boolean enabled,
    List<String> excludedKeys
) {}

// 使用
@Component
public class CacheManager {
    private final CacheProperties props;

    public CacheManager(CacheProperties props) {
        this.props = props;
    }
}
```

**最佳实践：**

1. **敏感信息永远不要提交到 Git**——用环境变量、Secret 或 Jasypt 加密
2. **Profile 配置只放差异部分**——公共配置放 `application.yml`
3. **`@ConfigurationProperties` 优于 `@Value`**——类型安全、支持嵌套、IDE 提示
4. **配置变更要有版本管理**——配合 Nacos Config 实现配置回滚
5. **合理使用 `spring.config.import`**——按模块拆分配置文件
