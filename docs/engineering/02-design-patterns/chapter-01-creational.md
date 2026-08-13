# 创建型模式

## 1. 工厂方法

```java
interface PaymentFactory {
    Payment create();
}
class AlipayFactory implements PaymentFactory {
    public Payment create() { return new Alipay(); }
}
```

## 2. 抽象工厂

```java
interface UIFactory {
    Button createButton();
    Input createInput();
}
class DarkUIFactory implements UIFactory {
    public Button createButton() { return new DarkButton(); }
    public Input createInput() { return new DarkInput(); }
}
```

## 3. 单例

```java
// 枚举单例（推荐）
enum Singleton {
    INSTANCE;
}

// 双重检查锁
class Singleton {
    private static volatile Singleton instance;
    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) instance = new Singleton();
            }
        }
        return instance;
    }
}
```

## 4. 建造者

```java
User user = User.builder()
    .name("张三")
    .age(25)
    .email("zhangsan@example.com")
    .build();
```

## 5. 原型

```java
class Prototype implements Cloneable {
    public Prototype clone() { return (Prototype) super.clone(); }
}
```

---
*待补充：更多创建型模式*
