# RESTful API 设计

## 1. REST 设计原则

- 资源导向：URL 表示资源
- HTTP 动词：GET/POST/PUT/DELETE
- 无状态：每次请求独立
- 统一接口：标准 HTTP 响应码

## 2. @RestController

```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) { /* ... */ }
    
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public User createUser(@Valid @RequestBody UserDTO dto) { /* ... */ }
    
    @PutMapping("/{id}")
    public User updateUser(@PathVariable Long id, @Valid @RequestBody UserDTO dto) { /* ... */ }
    
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id) { /* ... */ }
}
```

## 3. 内容协商

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void configureContentNegotiation(ContentNegotiationConfigurer configurer) {
        configurer.defaultContentType(MediaType.APPLICATION_JSON)
                  .mediaType("json", MediaType.APPLICATION_JSON)
                  .mediaType("xml", MediaType.APPLICATION_XML);
    }
}
```

## 4. 全局异常处理

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(ResourceNotFoundException ex) {
        return new ErrorResponse(404, ex.getMessage());
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        // 处理参数校验异常
    }
}
```

## 5. REST 实战

### 5.1 统一响应封装

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ApiResponse<T> {
    private int code;
    private String message;
    private T data;
    private LocalDateTime timestamp;

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(200, "success", data, LocalDateTime.now());
    }

    public static <T> ApiResponse<T> error(int code, String message) {
        return new ApiResponse<>(code, message, null, LocalDateTime.now());
    }
}

@RestControllerAdvice
public class ResponseAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType, Class converterType) {
        // 排除 Swagger 等框架的响应
        return !returnType.getDeclaringClass().getName().contains("swagger");
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType,
            MediaType mediaType, Class converterType,
            ServerHttpRequest request, ServerHttpResponse response) {
        if (body instanceof ApiResponse) {
            return body;  // 已经封装过了
        }
        if (body instanceof String) {
            // String 类型需要手动序列化
            return new ObjectMapper().writeValueAsString(ApiResponse.success(body));
        }
        return ApiResponse.success(body);
    }
}
```

### 5.2 分页查询设计

```java
@Data
public class PageQuery {
    @Min(value = 1, message = "页码最小为1")
    private int page = 1;

    @Min(value = 1) @Max(value = 100, message = "每页最多100条")
    private int size = 20;

    private String sortBy;
    private String order = "desc";

    public Pageable toPageable() {
        Sort sort = sortBy != null ? Sort.by(Sort.Direction.fromString(order), sortBy) : Sort.unsorted();
        return PageRequest.of(page - 1, size, sort);  // 转为 0-indexed
    }
}

@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping
    public Page<User> listUsers(PageQuery query) {
        return userService.findAll(query.toPageable());
    }
}
```

### 5.3 HATEOAS 超媒体

```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @GetMapping("/{id}")
    public EntityModel<Order> getOrder(@PathVariable Long id) {
        Order order = orderService.findById(id);

        EntityModel<Order> model = EntityModel.of(order);
        model.add(linkTo(methodOn(OrderController.class).getOrder(id)).withSelfRel());
        model.add(linkTo(methodOn(OrderController.class).cancelOrder(id)).withRel("cancel"));
        model.add(linkTo(methodOn(PaymentController.class).pay(id)).withRel("payment"));

        return model;
    }

    @PostMapping("/{id}/cancel")
    public EntityModel<Order> cancelOrder(@PathVariable Long id) {
        Order order = orderService.cancel(id);
        return EntityModel.of(order);
    }
}
```

### 5.4 REST 版本控制

```java
// 方式一：URL 路径版本
@RestController
@RequestMapping("/api/v1/users")
public class UserControllerV1 { /* ... */ }

@RestController
@RequestMapping("/api/v2/users")
public class UserControllerV2 { /* ... */ }

// 方式二：请求头版本
@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping(value = "/{id}", headers = "X-API-VERSION=1")
    public UserV1 getUserV1(@PathVariable Long id) { /* ... */ }

    @GetMapping(value = "/{id}", headers = "X-API-VERSION=2")
    public UserV2 getUserV2(@PathVariable Long id) { /* ... */ }
}

// 方式三：媒体类型版本（GitHub 风格）
@GetMapping(value = "/{id}", produces = "application/vnd.myapp.v1+json")
public UserV1 getUserV1(@PathVariable Long id) { /* ... */ }
```

**最佳实践：**

1. **统一响应封装**——所有接口返回相同结构的 JSON，前端解析更一致
2. **URL 使用名词复数**——`/api/users` 而非 `/api/user` 或 `/api/getUser`
3. **合理使用 HTTP 状态码**——201 Created、204 No Content、409 Conflict 等
4. **API 版本管理**——内部系统用 URL 路径版本，对外 API 用请求头版本
5. **幂等性设计**——PUT 和 DELETE 天然幂等，POST 创建操作考虑幂等 Token
