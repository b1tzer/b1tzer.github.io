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

---
*待补充：更多行为型模式*
