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

---
*待补充：更多集成测试场景*
