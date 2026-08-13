# SOLID 原则

## 1. S - 单一职责原则 (SRP)

一个类只有一个职责。

```java
// 差：一个类做多件事
class User {
    void save() { /* 数据库操作 */ }
    void sendEmail() { /* 邮件发送 */ }
}

// 好：职责分离
class UserRepository {
    void save(User user) { /* 数据库操作 */ }
}
class EmailService {
    void sendEmail(User user) { /* 邮件发送 */ }
}
```

## 2. O - 开闭原则 (OCP)

对扩展开放，对修改关闭。

```java
// 通过接口扩展，而非修改现有代码
interface Payment {
    void pay(BigDecimal amount);
}
class Alipay implements Payment { /* ... */ }
class WechatPay implements Payment { /* ... */ }
```

## 3. L - 里氏替换原则 (LSP)

子类可以替换父类。

## 4. I - 接口隔离原则 (ISP)

客户端不应依赖不需要的接口。

## 5. D - 依赖倒置原则 (DIP)

依赖抽象，而非具体实现。

```java
// 依赖注入
@Service
class OrderService {
    private final Payment payment;  // 依赖接口
    OrderService(Payment payment) { this.payment = payment; }
}
```

---
*待补充：更多 SOLID 实战*
