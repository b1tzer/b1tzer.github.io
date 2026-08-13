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

---
*待补充：更多测试场景*
