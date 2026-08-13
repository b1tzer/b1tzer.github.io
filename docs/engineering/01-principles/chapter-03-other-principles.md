# 其他设计原则

## 1. DRY (Don't Repeat Yourself)

避免重复代码。

```java
// 差：重复逻辑
void processOrder(Order order) {
    validate(order);
    // ... 处理逻辑
}
void processRefund(Refund refund) {
    validate(refund);
    // ... 处理逻辑
}

// 好：提取公共方法
void validate(Object entity) { /* 通用校验 */ }
```

## 2. KISS (Keep It Simple, Stupid)

保持简单。

## 3. YAGNI (You Aren't Gonna Need It)

不要过度设计。

## 4. 迪米特法则 (LoD)

最少知识原则，只与直接朋友通信。

```java
// 差：链式调用
order.getCustomer().getAddress().getCity();

// 好：封装
order.getShippingCity();
```

## 5. 组合优于继承

```java
// 差：继承
class ArrayList<E> extends AbstractList<E> { /* ... */ }

// 好：组合
class OrderService {
    private final Validator validator;
    private final Repository repository;
}
```

---
*待补充：更多设计原则*
