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

---
*待补充：更多 API 设计*
