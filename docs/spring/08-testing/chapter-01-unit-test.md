# 单元测试

## 1. JUnit 5

```java
@SpringBootTest
class UserServiceTest {
    @MockBean
    private UserRepository userRepository;
    
    @Autowired
    private UserService userService;
    
    @Test
    void testGetUser() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(new User(1L, "张三")));
        User user = userService.getUser(1L);
        assertEquals("张三", user.getName());
    }
    
    @Test
    void testGetUserNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> userService.getUser(99L));
    }
}
```

## 2. Mockito

```java
// 验证方法调用
verify(userRepository, times(1)).save(any());

// 验证顺序
InOrder inOrder = inOrder(userRepository);
inOrder.verify(userRepository).save(any());
inOrder.verify(userRepository).flush();
```

## 3. 单元测试高级用法

### 3.1 JUnit 5 参数化测试

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    // 参数化测试
    @ParameterizedTest
    @CsvSource({
        "1, 张三",
        "2, 李四",
        "3, 王五"
    })
    void testGetUser(Long id, String expectedName) {
        when(userRepository.findById(id))
            .thenReturn(Optional.of(new User(id, expectedName, "email@test.com")));

        User user = userService.getUser(id);
        assertEquals(expectedName, user.getName());
    }

    // 方法源
    @ParameterizedTest
    @MethodSource("invalidEmails")
    void testInvalidEmail(String email) {
        assertThrows(IllegalArgumentException.class,
            () -> userService.createUser(new UserDTO("张三", email)));
    }

    static Stream<String> invalidEmails() {
        return Stream.of("", "abc", "@test.com", "test@", "test @test.com");
    }
}
```

### 3.2 测试异常与超时

```java
class UserServiceExceptionTest {

    @Test
    void testExceptionMessage() {
        // 验证异常消息
        IllegalArgumentException ex = assertThrows(
            IllegalArgumentException.class,
            () -> userService.createUser(new UserDTO("", "email@test.com")));
        assertEquals("用户名不能为空", ex.getMessage());
    }

    @Test
    void testTimeout() {
        // 验证方法在指定时间内完成
        assertTimeout(Duration.ofSeconds(2), () -> {
            userService.batchProcess(List.of(1L, 2L, 3L));
        });
    }

    @Test
    void testTimeoutPreemptively() {
        // 超时后立即终止（更严格）
        assertTimeoutPreemptively(Duration.ofSeconds(1), () -> {
            userService.callExternalService();
        });
    }
}
```

### 3.3 测试生命周期回调

```java
class UserServiceLifecycleTest {

    @BeforeAll
    static void beforeAll() {
        // 整个测试类执行前（只执行一次）
        // 用于初始化昂贵的资源
    }

    @BeforeEach
    void setUp() {
        // 每个测试方法执行前
        // 用于初始化测试数据
    }

    @AfterEach
    void tearDown() {
        // 每个测试方法执行后
        // 用于清理测试数据
    }

    @AfterAll
    static void afterAll() {
        // 整个测试类执行后
    }

    @Test
    @DisplayName("创建用户 - 正常场景")
    void testCreateUser() {
        // Given
        UserDTO dto = new UserDTO("张三", "zhangsan@test.com");

        // When
        User user = userService.createUser(dto);

        // Then
        assertNotNull(user.getId());
        assertEquals("张三", user.getName());
    }
}
```

### 3.4 嵌套测试

class OrderServiceTest {

    @Nested
    @DisplayName("创建订单")
    class CreateOrder {

        @Test
        @DisplayName("正常创建")
        void shouldCreateOrder() {
            // ...
        }

        @Test
        @DisplayName("库存不足时抛异常")
        void shouldThrowWhenInsufficientStock() {
            // ...
        }
    }

    @Nested
    @DisplayName("取消订单")
    class CancelOrder {

        @Test
        @DisplayName("正常取消")
        void shouldCancelOrder() {
            // ...
        }

        @Test
        @DisplayName("已发货的订单不能取消")
        void shouldNotCancelShippedOrder() {
            // ...
        }
    }
}

**最佳实践：**

1. **测试命名清晰**——`should_预期行为_when_条件` 或 `test_方法_场景_预期`
2. **AAA 模式**——Arrange（准备）、Act（执行）、Assert（断言）
3. **一个测试只验证一个行为**——不要在一个测试中验证多个不相关的逻辑
4. **Mock 外部依赖，不 Mock 被测类**——只 Mock 你的类调用的外部依赖
5. **测试覆盖率不是唯一指标**——关键路径 100% 覆盖，边界条件重点测试
