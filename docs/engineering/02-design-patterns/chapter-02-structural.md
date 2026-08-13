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

## 5. 桥接模式（Bridge）

将抽象与实现分离，使它们可以独立变化。

```java
// 实现接口
interface Renderer {
    void render(String shape);
}

class VectorRenderer implements Renderer {
    @Override
    public void render(String shape) {
        System.out.println("绘制矢量 " + shape);
    }
}

class RasterRenderer implements Renderer {
    @Override
    public void render(String shape) {
        System.out.println("绘制像素 " + shape);
    }
}

// 抽象类持有实现的引用
abstract class Shape2 {
    protected Renderer renderer;
    
    Shape2(Renderer renderer) { this.renderer = renderer; }
    abstract void draw();
}

class Circle extends Shape2 {
    Circle(Renderer renderer) { super(renderer); }
    @Override
    void draw() { renderer.render("圆形"); }
}

// 使用：形状和渲染器可以独立变化
Shape2 circle = new Circle(new VectorRenderer());
circle.draw(); // 绘制矢量圆形
```

## 6. 组合模式（Composite）

将对象组合成树形结构，使客户端对单个对象和组合对象的使用具有一致性。

```java
// 组件接口
interface FileSystemNode {
    long getSize();
    void print(String indent);
}

// 叶子节点
class File implements FileSystemNode {
    private final String name;
    private final long size;
    
    File(String name, long size) { this.name = name; this.size = size; }
    
    @Override
    public long getSize() { return size; }
    
    @Override
    public void print(String indent) {
        System.out.println(indent + "📄 " + name + " (" + size + " bytes)");
    }
}

// 组合节点
class Directory implements FileSystemNode {
    private final String name;
    private final List<FileSystemNode> children = new ArrayList<>();
    
    Directory(String name) { this.name = name; }
    
    void add(FileSystemNode node) { children.add(node); }
    
    @Override
    public long getSize() {
        return children.stream().mapToLong(FileSystemNode::getSize).sum();
    }
    
    @Override
    public void print(String indent) {
        System.out.println(indent + "📁 " + name + "/");
        children.forEach(child -> child.print(indent + "  "));
    }
}

// 使用
Directory root = new Directory("project");
Directory src = new Directory("src");
src.add(new File("Main.java", 1024));
src.add(new File("Utils.java", 2048));
root.add(src);
root.add(new File("README.md", 512));
root.print("");
System.out.println("总大小: " + root.getSize() + " bytes");
```

## 7. 享元模式（Flyweight）

通过共享技术有效地支持大量细粒度的对象，减少内存占用。

```java
// 享元工厂：管理共享对象
class CharacterFlyweightFactory {
    private static final Map<String, CharacterFlyweight> cache = new HashMap<>();
    
    public static CharacterFlyweight get(char c, String font) {
        String key = c + "_" + font;
        return cache.computeIfAbsent(key, k -> new CharacterFlyweight(c, font));
    }
    
    public static int getCacheSize() { return cache.size(); }
}

// 享元对象：内部状态（可共享）
record CharacterFlyweight(char character, String font) {
    public void render(int x, int y) {
        // 在 (x, y) 位置绘制字符
        System.out.println("在 (" + x + "," + y + ") 绘制 " + character + " [" + font + "]");
    }
}

// 使用：10000 个字符只创建有限个享元对象
class TextEditor {
    public void renderText(String text, String font) {
        for (int i = 0; i < text.length(); i++) {
            CharacterFlyweight cf = CharacterFlyweightFactory.get(text.charAt(i), font);
            cf.render(i * 10, 0);
        }
        System.out.println("缓存大小: " + CharacterFlyweightFactory.getCacheSize());
    }
}
```

## 8. 结构型模式选型指南

| 模式 | 解决的问题 | Java/框架中的应用 |
|------|-----------|------------------|
| 代理 | 控制访问、增强功能 | Spring AOP、动态代理、MyBatis Mapper |
| 适配器 | 接口不兼容 | `InputStreamReader`、`Arrays.asList()` |
| 装饰器 | 动态添加功能 | Java I/O 流、Collections.synchronizedList() |
| 外观 | 简化复杂子系统 | SLF4J 日志门面、JdbcTemplate |
| 桥接 | 抽象与实现分离 | JDBC Driver 接口 |
| 组合 | 树形结构统一操作 | Java Swing 组件树、XML DOM |
| 享元 | 大量细粒度对象共享 | `Integer.valueOf()` 缓存、String 常量池 |
