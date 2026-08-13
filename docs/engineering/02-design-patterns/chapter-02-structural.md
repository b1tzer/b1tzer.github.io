# 结构型模式

## 1. 代理模式

```java
interface Image { void display(); }
class RealImage implements Image {
    public void display() { /* 加载并显示 */ }
}
class ProxyImage implements Image {
    private RealImage real;
    public void display() {
        if (real == null) real = new RealImage();
        real.display();
    }
}
```

## 2. 适配器模式

```java
interface Target { void request(); }
class Adaptee {
    void specificRequest() { /* ... */ }
}
class Adapter implements Target {
    private Adaptee adaptee;
    public void request() { adaptee.specificRequest(); }
}
```

## 3. 装饰器模式

```java
interface DataSource { void writeData(String data); }
class FileDataSource implements DataSource { /* ... */ }
class EncryptionDecorator implements DataSource {
    private DataSource wrapped;
    public void writeData(String data) {
        // 加密后写入
        wrapped.writeData(encrypt(data));
    }
}
```

## 4. 外观模式

```java
class OrderFacade {
    private InventoryService inventory;
    private PaymentService payment;
    private ShippingService shipping;
    
    public void placeOrder(Order order) {
        inventory.check(order);
        payment.charge(order);
        shipping.ship(order);
    }
}
```

---
*待补充：更多结构型模式*
