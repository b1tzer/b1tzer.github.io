# 依赖注入

## 1. DI 类型

### 构造器注入（推荐）
```java
@Service
public class UserService {
    private final UserRepository userRepository;
    
    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}
```

### 字段注入
```java
@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
}
```

### Setter 注入
```java
@Service
public class UserService {
    private UserRepository userRepository;
    
    @Autowired
    public void setUserRepository(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}
```

## 2. @Autowired 原理

AutowiredAnnotationBeanPostProcessor 处理 @Autowired 注解：
1. 按类型查找
2. 找到多个按名称匹配
3. 使用 @Qualifier 指定

## 3. @Resource vs @Autowired

| 特性 | @Autowired | @Resource |
|------|-----------|-----------|
| 来源 | Spring | JSR-250 |
| 匹配方式 | 按类型 | 按名称 |
| 必须存在 | required=false 可选 | 必须存在 |

## 4. @Qualifier 精确匹配

当同一类型有多个 Bean 时，使用 `@Qualifier` 指定注入哪一个：

```java
// 定义两个同类型的 Bean
@Configuration
public class DataSourceConfig {

    @Bean("masterDataSource")
    public DataSource masterDataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl("jdbc:mysql://master:3306/db");
        return ds;
    }

    @Bean("slaveDataSource")
    public DataSource slaveDataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl("jdbc:mysql://slave:3306/db");
        return ds;
    }
}

// 注入时使用 @Qualifier 指定
@Service
public class OrderService {
    private final DataSource masterDs;
    private final DataSource slaveDs;

    public OrderService(
            @Qualifier("masterDataSource") DataSource masterDs,
            @Qualifier("slaveDataSource") DataSource slaveDs) {
        this.masterDs = masterDs;
        this.slaveDs = slaveDs;
    }
}
```

## 5. 集合注入

Spring 可以自动收集同一类型的所有 Bean 注入到集合中：

```java
// 定义策略接口
public interface PaymentStrategy {
    String getType();
    void pay(BigDecimal amount);
}

// 多个实现
@Component
public class AlipayStrategy implements PaymentStrategy {
    @Override
    public String getType() { return "alipay"; }

    @Override
    public void pay(BigDecimal amount) {
        System.out.println("支付宝支付: " + amount);
    }
}

@Component
public class WechatPayStrategy implements PaymentStrategy {
    @Override
    public String getType() { return "wechat"; }

    @Override
    public void pay(BigDecimal amount) {
        System.out.println("微信支付: " + amount);
    }
}

// 自动注入所有实现
@Service
public class PaymentService {
    private final Map<String, PaymentStrategy> strategyMap;

    // Spring 会自动将所有 PaymentStrategy 实现注入到 Map 中，key 为 Bean 名称
    public PaymentService(Map<String, PaymentStrategy> strategies) {
        this.strategyMap = strategies;
    }

    // 也支持 List 注入
    public PaymentService(List<PaymentStrategy> strategies) {
        this.strategyMap = strategies.stream()
            .collect(Collectors.toMap(PaymentStrategy::getType, s -> s));
    }

    public void pay(String type, BigDecimal amount) {
        PaymentStrategy strategy = strategyMap.get(type);
        if (strategy == null) {
            throw new IllegalArgumentException("不支持的支付方式: " + type);
        }
        strategy.pay(amount);
    }
}
```

## 6. @Value 注入配置值

```java
@Service
public class EmailService {

    @Value("${mail.smtp.host}")
    private String smtpHost;

    @Value("${mail.smtp.port:25}")  // 默认值 25
    private int smtpPort;

    @Value("${mail.recipients}")
    private List<String> recipients;  // 注入为 List

    @Value("#{systemProperties['user.home']}")  // SpEL 表达式
    private String userHome;
}
```

## 7. ObjectProvider 延迟注入

对于可选依赖或延迟初始化的场景，使用 `ObjectProvider` 避免启动时找不到 Bean 就报错：

```java
@Service
public class ReportService {

    private final ObjectProvider<CacheManager> cacheManagerProvider;

    public ReportService(ObjectProvider<CacheManager> cacheManagerProvider) {
        this.cacheManagerProvider = cacheManagerProvider;
    }

    public String generateReport() {
        // 使用时才获取，不存在返回 null 而不是抛异常
        CacheManager cacheManager = cacheManagerProvider.getIfAvailable();
        if (cacheManager != null) {
            // 尝试从缓存获取
            Object cached = cacheManager.getCache("reports").get("report-key");
            if (cached != null) {
                return cached.toString();
            }
        }
        return doGenerateReport();
    }

    // 如果依赖必须存在，可使用 getIfUnique 或 stream 操作
    public List<Plugin> getPlugins() {
        return cacheManagerProvider.stream()
            .map(cm -> new Plugin(cm.getClass().getSimpleName()))
            .collect(Collectors.toList());
    }
}
```

**最佳实践：**

1. **构造器注入 + `final` 字段**是首选方式，确保不可变性
2. **`@Qualifier` 优于 `@Resource`**——前者是 Spring 原生注解，语义更清晰
3. **集合注入**适合策略模式、插件机制等需要扩展点的场景
4. **`ObjectProvider`** 适合可选依赖，避免 `@Autowired(required=false)` 导致 NPE 风险
5. **避免循环依赖**——优先通过重构消除循环，其次才考虑 Setter 注入
