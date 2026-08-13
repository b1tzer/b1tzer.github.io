# API 设计

## 1. RESTful 设计

```
GET    /users          # 列表
GET    /users/{id}     # 详情
POST   /users          # 创建
PUT    /users/{id}     # 全量更新
PATCH  /users/{id}     # 部分更新
DELETE /users/{id}     # 删除
```

## 2. 响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": { "id": 1, "name": "张三" }
}
```

## 3. 版本管理

```
/api/v1/users
/api/v2/users
```

## 4. 错误处理

```json
{
  "code": 400,
  "message": "参数错误",
  "errors": [
    { "field": "email", "message": "邮箱格式不正确" }
  ]
}
```

## 5. API 文档

- Swagger/OpenAPI
- API Blueprint
- RAML

## 6. RESTful API 设计最佳实践

### 6.1 命名规范

```java
// 好的 URL 设计
// 使用名词复数，不使用动词
GET    /api/v1/users              // 获取用户列表
GET    /api/v1/users/{id}         // 获取单个用户
POST   /api/v1/users              // 创建用户
PUT    /api/v1/users/{id}         // 全量更新用户
PATCH  /api/v1/users/{id}         // 部分更新用户
DELETE /api/v1/users/{id}         // 删除用户

// 子资源
GET    /api/v1/users/{id}/orders  // 获取用户的订单
POST   /api/v1/users/{id}/orders  // 为用户创建订单

// 过滤、排序、分页
GET    /api/v1/users?status=active&sort=created_at,desc&page=1&size=20
```

### 6.2 统一响应格式

```java
// 统一响应封装
public class ApiResponse<T> {
    private int code;
    private String message;
    private T data;
    private long timestamp;
    
    public static <T> ApiResponse<T> success(T data) {
        ApiResponse<T> resp = new ApiResponse<>();
        resp.code = 200;
        resp.message = "success";
        resp.data = data;
        resp.timestamp = System.currentTimeMillis();
        return resp;
    }
    
    public static <T> ApiResponse<T> error(int code, String message) {
        ApiResponse<T> resp = new ApiResponse<>();
        resp.code = code;
        resp.message = message;
        resp.timestamp = System.currentTimeMillis();
        return resp;
    }
}

// 分页响应
public class PageResponse<T> {
    private List<T> data;
    private long total;
    private int page;
    private int size;
    private int totalPages;
}
```

### 6.3 全局异常处理

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ApiResponse<Void> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
            .map(err -> err.getField() + ": " + err.getDefaultMessage())
            .collect(Collectors.joining("; "));
        return ApiResponse.error(400, message);
    }
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ApiResponse<Void> handleNotFound(ResourceNotFoundException e) {
        return ApiResponse.error(404, e.getMessage());
    }
    
    @ExceptionHandler(Exception.class)
    public ApiResponse<Void> handleException(Exception e) {
        log.error("系统异常", e);
        return ApiResponse.error(500, "系统繁忙，请稍后重试");
    }
}
```

### 6.4 接口幂等性

```java
// 幂等性设计：同一个请求执行多次，结果一致
// PUT/DELETE 天然幂等
// POST 需要通过幂等键实现

@PostMapping("/api/v1/orders")
public ApiResponse<Long> createOrder(
        @RequestBody CreateOrderRequest request,
        @RequestHeader("Idempotent-Key") String idempotentKey) {
    // 检查幂等键
    Order existing = orderRepository.findByIdempotentKey(idempotentKey);
    if (existing != null) {
        return ApiResponse.success(existing.getId());
    }
    
    // 创建订单
    Long orderId = orderService.createOrder(request, idempotentKey);
    return ApiResponse.success(orderId);
}
```

### 6.5 API 版本管理

```java
// URL 路径版本（推荐）
// GET /api/v1/users
// GET /api/v2/users

// 请求头版本
// Accept: application/vnd.myapp.v2+json

// 版本兼容原则
// - 新增字段：向后兼容，不需要新版本
// - 删除字段：需要新版本，旧版本保留一段时间
// - 修改字段含义：需要新版本
```

> **API 设计的核心**：好的 API 应该是自解释的、一致的、向后兼容的。API 是你和其他开发者的契约，设计时要站在调用者的角度思考。

