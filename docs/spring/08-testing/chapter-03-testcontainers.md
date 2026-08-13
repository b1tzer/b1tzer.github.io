# Testcontainers

## 1. 配置

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>mysql</artifactId>
    <scope>test</scope>
</dependency>
```

## 2. 使用

```java
@SpringBootTest
@Testcontainers
class UserRepositoryTest {
    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
        .withDatabaseName("test")
        .withUsername("test")
        .withPassword("test");
    
    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);
    }
    
    @Test
    void testWithRealDatabase() {
        // 使用真实数据库测试
    }
}
```

## 3. Testcontainers 高级用法

### 3.1 多容器组合

```java
@SpringBootTest
@Testcontainers
class MultiContainerTest {

    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test")
        .withInitScript("schema.sql");  // 初始化脚本

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
        .withExposedPorts(6379);

    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        // MySQL
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);

        // Redis
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));

        // Kafka
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Test
    void testWithRealDependencies() {
        // 使用真实的 MySQL、Redis、Kafka 进行测试
    }
}
```

### 3.2 容器生命周期管理

```java
@Testcontainers
class LifecycleTest {

    // 共享容器（整个测试类共用）
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
        .withDatabaseName("test")
        .withUsername("test")
        .withPassword("test")
        .withReuse(true);  // 容器复用（需配置 testcontainers.reuse.enable=true）

    // 每个测试方法独立的容器
    @Container
    private GenericContainer<?> nginx = new GenericContainer<>("nginx:alpine")
        .withExposedPorts(80);

    @Test
    void testNginx() {
        String url = String.format("http://%s:%d", nginx.getHost(), nginx.getMappedPort(80));
        // 测试 nginx 是否正常运行
        RestTemplate restTemplate = new RestTemplate();
        ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
        assertEquals(200, response.getStatusCodeValue());
    }
}
```

### 3.3 自定义容器

```java
// 自定义 Nacos 容器
public class NacosContainer extends GenericContainer<NacosContainer> {

    public NacosContainer() {
        super("nacos/nacos-server:v2.3.0");
        withExposedPorts(8848, 9848);
        withEnv("MODE", "standalone");
        withEnv("SPRING_DATASOURCE_PLATFORM", "");
    }

    public String getGrpcPort() {
        return String.valueOf(getMappedPort(9848));
    }

    public String getHttpPort() {
        return String.valueOf(getMappedPort(8848));
    }
}

// 使用
@SpringBootTest
@Testcontainers
class NacosIntegrationTest {

    @Container
    static NacosContainer nacos = new NacosContainer();

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.cloud.nacos.config.server-addr",
            () -> nacos.getHost() + ":" + nacos.getHttpPort());
    }

    @Test
    void testConfigFromNacos() {
        // 测试从 Nacos 读取配置
    }
}
```

### 3.4 Testcontainers + JUnit 5 Abstract Base Class

```java
// 测试基类：所有需要数据库的测试继承此类
public abstract class AbstractDatabaseTest {

    @Container
    protected static final MySQLContainer<?> mysql =
        new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureDataSource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);
    }
}

// 子类继承基类，自动获得数据库配置
@SpringBootTest
class UserRepositoryTest extends AbstractDatabaseTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void testSaveAndFind() {
        User user = userRepository.save(new User(null, "张三", "zhangsan@test.com"));
        assertNotNull(user.getId());

        Optional<User> found = userRepository.findById(user.getId());
        assertTrue(found.isPresent());
        assertEquals("张三", found.get().getName());
    }
}
```

**最佳实践：**

1. **容器复用**——配置 `withReuse(true)` + `~/.testcontainers.properties` 中 `testcontainers.reuse.enable=true`
2. **初始化脚本**——`withInitScript("schema.sql")` 自动建表，无需手动执行 DDL
3. **使用固定版本镜像**——`"mysql:8.0"` 而非 `"mysql:latest"`，保证测试可重复
4. **测试基类抽取公共容器**——避免每个测试类都重复配置容器
5. **CI/CD 集成**——确保 CI 环境支持 Docker，否则 Testcontainers 无法运行
6. **并行测试**——Testcontainers 支持并行执行，但端口会动态分配，不会冲突
