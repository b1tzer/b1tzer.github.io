# 行为型模式

## 1. 策略模式

```java
interface SortStrategy { void sort(int[] arr); }
class QuickSort implements SortStrategy { /* ... */ }
class MergeSort implements SortStrategy { /* ... */ }

class Sorter {
    private SortStrategy strategy;
    public void sort(int[] arr) { strategy.sort(arr); }
}
```

## 2. 观察者模式

```java
interface Observer { void update(String event); }
class EventBus {
    private Map<String, List<Observer>> observers = new HashMap<>();
    void subscribe(String event, Observer observer) { /* ... */ }
    void publish(String event) { /* ... */ }
}
```

## 3. 模板方法

```java
abstract class AbstractParser {
    abstract void parseHeader();
    abstract void parseBody();
    
    void parse() {  // 模板方法
        parseHeader();
        parseBody();
    }
}
```

## 4. 责任链模式

```java
abstract class Handler {
    protected Handler next;
    public Handler setNext(Handler next) { this.next = next; return next; }
    abstract void handle(Request request);
}
```

## 5. 命令模式

```java
interface Command { void execute(); }
class OrderCommand implements Command {
    private OrderService service;
    private Order order;
    public void execute() { service.placeOrder(order); }
}
```

## 6. 状态模式（State）

允许对象在内部状态改变时改变其行为。

```java
// 状态接口
interface OrderState {
    void next(OrderContext context);
    void cancel(OrderContext context);
    String getStatus();
}

class CreatedState implements OrderState {
    @Override
    public void next(OrderContext context) {
        System.out.println("订单已支付，进入已支付状态");
        context.setState(new PaidState());
    }
    @Override
    public void cancel(OrderContext context) {
        System.out.println("订单已取消");
        context.setState(new CancelledState());
    }
    @Override
    public String getStatus() { return "CREATED"; }
}

class PaidState implements OrderState {
    @Override
    public void next(OrderContext context) {
        System.out.println("订单已发货，进入配送状态");
        context.setState(new ShippedState());
    }
    @Override
    public void cancel(OrderContext context) {
        System.out.println("已支付订单取消，需退款");
        context.setState(new CancelledState());
    }
    @Override
    public String getStatus() { return "PAID"; }
}

class ShippedState implements OrderState {
    @Override
    public void next(OrderContext context) {
        System.out.println("订单已签收");
        context.setState(new CompletedState());
    }
    @Override
    public void cancel(OrderContext context) {
        throw new IllegalStateException("已发货订单不能直接取消");
    }
    @Override
    public String getStatus() { return "SHIPPED"; }
}

class CancelledState implements OrderState {
    @Override public void next(OrderContext c) { throw new IllegalStateException("已取消订单无法继续"); }
    @Override public void cancel(OrderContext c) { throw new IllegalStateException("订单已被取消"); }
    @Override public String getStatus() { return "CANCELLED"; }
}

class CompletedState implements OrderState {
    @Override public void next(OrderContext c) { throw new IllegalStateException("订单已完成"); }
    @Override public void cancel(OrderContext c) { throw new IllegalStateException("已完成订单不能取消"); }
    @Override public String getStatus() { return "COMPLETED"; }
}

// 上下文
class OrderContext {
    private OrderState state = new CreatedState();
    
    public void setState(OrderState state) { this.state = state; }
    public String getStatus() { return state.getStatus(); }
    public void next() { state.next(this); }
    public void cancel() { state.cancel(this); }
}

// 使用
OrderContext order = new OrderContext();
order.next();    // CREATED -> PAID
order.next();    // PAID -> SHIPPED
order.next();    // SHIPPED -> COMPLETED
```

## 7. 迭代器模式（Iterator）

提供一种方法顺序访问一个聚合对象中的各个元素，而不暴露其内部表示。

```java
// 自定义集合 + 迭代器
class TreeNode<T> {
    T value;
    TreeNode<T> left, right;
    
    TreeNode(T value) { this.value = value; }
}

class InOrderIterator<T> implements Iterator<T> {
    private final Deque<TreeNode<T>> stack = new ArrayDeque<>();
    
    InOrderIterator(TreeNode<T> root) {
        pushLeft(root);
    }
    
    private void pushLeft(TreeNode<T> node) {
        while (node != null) {
            stack.push(node);
            node = node.left;
        }
    }
    
    @Override
    public boolean hasNext() { return !stack.isEmpty(); }
    
    @Override
    public T next() {
        TreeNode<T> node = stack.pop();
        pushLeft(node.right);
        return node.value;
    }
}
```

## 8. 中介者模式（Mediator）

用一个中介对象封装一系列对象之间的交互。

```java
// 中介者接口
interface ChatMediator {
    void sendMessage(String msg, User user);
    void addUser(User user);
}

// 具体中介者
class ChatRoom implements ChatMediator {
    private final List<User> users = new ArrayList<>();
    
    @Override
    public void addUser(User user) { users.add(user); }
    
    @Override
    public void sendMessage(String msg, User sender) {
        users.stream()
             .filter(u -> u != sender)
             .forEach(u -> u.receive(msg));
    }
}

class User {
    private final String name;
    private final ChatMediator mediator;
    
    User(String name, ChatMediator mediator) {
        this.name = name;
        this.mediator = mediator;
        mediator.addUser(this);
    }
    
    void send(String msg) {
        System.out.println(name + " 发送: " + msg);
        mediator.sendMessage(msg, this);
    }
    
    void receive(String msg) {
        System.out.println(name + " 收到: " + msg);
    }
}
```

## 9. 行为型模式选型指南

| 模式 | 解决的问题 | Java/框架中的应用 |
|------|-----------|------------------|
| 策略 | 算法可替换 | `Comparator`、Spring `Resource` |
| 观察者 | 事件通知 | `EventListener`、Spring `ApplicationEvent` |
| 模板方法 | 定义算法骨架 | `AbstractList`、`HttpServlet.service()` |
| 责任链 | 请求的多级处理 | Servlet Filter、Netty Pipeline |
| 命令 | 操作对象化 | `Runnable`、`Callable` |
| 状态 | 状态驱动行为 | 订单状态机、TCP 连接状态 |
| 迭代器 | 集合遍历 | Java `Iterator` 接口 |
| 中介者 | 对象间解耦 | MVC 中的 Controller、消息中间件 |

> **行为型模式的核心意图**：定义对象之间的通信方式，使对象之间的耦合更加松散。
