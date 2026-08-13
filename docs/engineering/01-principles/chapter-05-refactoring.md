# 重构技术

## 1. 什么是重构

在不改变外部行为的前提下，改善代码内部结构。

## 2. 常用重构手法

| 手法 | 说明 |
|------|------|
| 提取方法 | 将代码片段提取为独立方法 |
| 提取类 | 将部分职责提取到新类 |
| 内联方法 | 将简单方法内联到调用处 |
| 移动方法 | 将方法移到更合适的类 |
| 重命名 | 使用更有意义的名称 |
| 引入参数对象 | 将多个参数封装为对象 |
| 引入接口 | 提取抽象接口 |
| 以多态取代条件 | 用策略模式替代 if-else |

## 3. 重构到模式

```java
// 重构前：大量 if-else
if (type.equals("alipay")) {
    // 支付宝逻辑
} else if (type.equals("wechat")) {
    // 微信逻辑
}

// 重构后：策略模式
interface Payment { void pay(BigDecimal amount); }
Map<String, Payment> payments = Map.of(
    "alipay", new Alipay(),
    "wechat", new WechatPay()
);
payments.get(type).pay(amount);
```

## 4. 重构时机

- 添加功能前
- 修复 Bug 时
- Code Review 后
- 定期重构（每周/每迭代）

---
*待补充：更多重构技术*
