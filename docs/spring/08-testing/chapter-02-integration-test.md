# 集成测试

## 1. @SpringBootTest

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class UserControllerTest {
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    void testGetUser() throws Exception {
        mockMvc.perform(get("/api/users/1"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.name").value("张三"));
    }
    
    @Test
    void testCreateUser() throws Exception {
        String json = "{\"name\":\"李四\",\"email\":\"lisi@example.com\"}";
        mockMvc.perform(post("/api/users")
               .contentType(MediaType.APPLICATION_JSON)
               .content(json))
               .andExpect(status().isCreated());
    }
}
```

## 2. @DataJpaTest

```java
@DataJpaTest
class UserRepositoryTest {
    @Autowired
    private TestEntityManager entityManager;
    
    @Autowired
    private UserRepository userRepository;
    
    @Test
    void testFindByEmail() {
        User user = new User(null, "张三", "zhangsan@example.com");
        entityManager.persist(user);
        
        Optional<User> found = userRepository.findByEmail("zhangsan@example.com");
        assertTrue(found.isPresent());
    }
}
```

## 3. 集成测试高级用法

### 3.1 切片测试

```java
// 只测试 Web 层（Controller + MockMvc）
@WebMvcTest(UserController.class)
class UserControllerSliceTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;  // Mock Service 层

    @Test
    void testGetUser() throws Exception {
        when(userService.getUser(1L))
            .thenReturn(new User(1L, "张三", "zhangsan@test.com"));

        mockMvc.perform(get("/api/users/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("张三"))
            .andExpect(jsonPath("$.email").value("zhangsan@test.com"));
    }

    @Test
    void testCreateUserValidation() throws Exception {
        String json = "{\"name\":\"\", \"email\":\"invalid\"}";

        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.details").isArray());
    }
}

// 只测试数据访问层（JPA Repository）
@DataJpaTest
class UserRepositorySliceTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private UserRepository userRepository;

    @Test
    void testFindByEmail() {
        // Given
        User user = new User(null, "张三", "zhangsan@test.com");
        entityManager.persistAndFlush(user);

        // When
        Optional<User> found = userRepository.findByEmail("zhangsan@test.com");

        // Then
        assertTrue(found.isPresent());
        assertEquals("张三", found.get().getName());
    }

    @Test
    void testFindByNameContaining() {
        entityManager.persistAndFlush(new User(null, "张三丰", "a@test.com"));
        entityManager.persistAndFlush(new User(null, "张无忌", "b@test.com"));
        entityManager.persistAndFlush(new User(null, "李四", "c@test.com"));

        List<User> result = userRepository.findByNameContaining("张");
        assertEquals(2, result.size());
    }
}
```

### 3.2 测试 REST 客户端

```java
// 测试 Feign 客户端
@SpringBootTest
@AutoConfigureWireMock(port = 8089)
class UserClientIntegrationTest {

    @Autowired
    private UserClient userClient;

    @Test
    void testGetUser() {
        // 桩 WireMock 响应
        stubFor(get(urlEqualTo("/api/users/1"))
            .willReturn(aResponse()
                .withHeader("Content-Type", "application/json")
                .withBody("{\"id\":1,\"name\":\"张三\"}")));

        User user = userClient.getUser(1L);
        assertEquals("张三", user.getName());

        // 验证请求被发出
        verify(getRequestedFor(urlEqualTo("/api/users/1")));
    }
}
```

### 3.3 测试事务回滚

```java
@SpringBootTest
class OrderServiceTransactionTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    @Transactional
    @Rollback  // 默认就是回滚
    void testCreateOrderShouldRollback() {
        // 这个测试中的数据库操作会自动回滚
        Order order = orderService.createOrder(new OrderRequest(1L, BigDecimal.TEN));
        assertNotNull(order.getId());

        // 在事务中查询，数据是可见的
        assertTrue(orderRepository.findById(order.getId()).isPresent());
    }
    // 测试结束后事务回滚，数据库中不会有这条数据
}
```

### 3.4 测试配置

```java
// 自定义测试配置
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "logging.level.com.example=DEBUG"
})
class CustomPropertyTest {
    // ...
}

// 测试随机端口
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RandomPortTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void testHello() {
        ResponseEntity<String> response = restTemplate
            .getForEntity("http://localhost:" + port + "/api/hello", String.class);
        assertEquals(200, response.getStatusCodeValue());
    }
}
```

**最佳实践：**

1. **切片测试优先**——`@WebMvcTest` 比 `@SpringBootTest` 快 10 倍
2. **`@DataJpaTest` 自动回滚**——测试数据不会污染数据库
3. **MockMvc 测试覆盖所有 HTTP 方法**——GET、POST、PUT、DELETE、PATCH
4. **WireMock 测试外部服务**——模拟第三方 API 的各种响应
5. **测试配置文件独立**——`application-test.yml` 不要和生产配置混用
