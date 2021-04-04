<!-- nav-start -->
---

[⬅️ 上一篇：AQS 与 CAS](06-AQS与CAS.md) | [🏠 返回目录](../README.md) | [下一篇：Stream 流式编程 ➡️](08-[Java8]Stream流式编程.md)

<!-- nav-end -->

# Lambda 表达式

---

## 1. 引入：它解决了什么问题？

Java 8 之前，传递"行为"需要写冗长的匿名内部类。Lambda 表达式让代码更简洁，将行为作为参数传递。

```java
// 传统写法：匿名内部类（5行）
List<String> names = Arrays.asList("Charlie", "Alice", "Bob");
Collections.sort(names, new Comparator<String>() {
    @Override
    public int compare(String a, String b) {
        return a.compareTo(b);
    }
});

// Lambda 写法（1行）
Collections.sort(names, (a, b) -> a.compareTo(b));

// 方法引用（更简洁）
Collections.sort(names, String::compareTo);
```

> **为什么 Lambda 能替代匿名内部类**：Lambda 只能替代**函数式接口**（只有一个抽象方法的接口）的匿名内部类。`Comparator` 只有一个 `compare` 方法，所以可以用 Lambda 替代。如果接口有多个抽象方法，Lambda 无法替代。

---

## 2. Lambda 语法

```
(参数列表) -> { 方法体 }
```

| 形式 | 示例 |
|------|------|
| 无参数 | `() -> System.out.println("hello")` |
| 单参数（可省略括号） | `x -> x * 2` |
| 多参数 | `(x, y) -> x + y` |
| 多行方法体 | `(x, y) -> { int sum = x + y; return sum; }` |

---

## 3. 四大函数式接口

| 接口 | 方法签名 | 用途 | 示例 | 记忆口诀 |
|------|---------|------|------|---------|
| `Function<T, R>` | `R apply(T t)` | 转换：输入T，输出R | `Function<String, Integer> f = Integer::parseInt` | 有进有出 |
| `Consumer<T>` | `void accept(T t)` | 消费：输入T，无返回 | `Consumer<String> c = System.out::println` | 有进无出 |
| `Supplier<T>` | `T get()` | 供给：无输入，输出T | `Supplier<List> s = ArrayList::new` | 无进有出 |
| `Predicate<T>` | `boolean test(T t)` | 断言：输入T，返回boolean | `Predicate<String> p = String::isEmpty` | 有进出布尔 |

```java
// Function：字符串转整数
Function<String, Integer> toInt = Integer::parseInt;
Integer result = toInt.apply("123"); // 123

// Consumer：打印每个元素
Consumer<String> printer = System.out::println;
printer.accept("Hello Lambda"); // Hello Lambda

// Supplier：延迟创建对象（懒加载）
Supplier<List<String>> listFactory = ArrayList::new;
List<String> list = listFactory.get();

// Predicate：过滤空字符串
Predicate<String> notEmpty = s -> !s.isEmpty();
boolean valid = notEmpty.test("Java"); // true
```

---

## 4. 方法引用四种形式

| 类型 | 语法 | 等价 Lambda | 使用场景 |
|------|------|------------|---------|
| 静态方法引用 | `Integer::parseInt` | `s -> Integer.parseInt(s)` | 调用静态方法 |
| 实例方法引用（特定对象） | `str::toUpperCase` | `() -> str.toUpperCase()` | 调用特定对象的方法 |
| 实例方法引用（任意对象） | `String::toUpperCase` | `s -> s.toUpperCase()` | 调用参数本身的方法 |
| 构造方法引用 | `ArrayList::new` | `() -> new ArrayList<>()` | 创建对象 |

---

## 5. Lambda 的限制：effectively final

```java
int count = 0;
// ❌ 编译错误：count 在 Lambda 外被修改
list.forEach(item -> count++); // Variable used in lambda should be effectively final

// 原因：Lambda 可能在不同线程中执行，如果允许修改外部变量会有并发问题
// Lambda 捕获的是变量的副本（值），而非引用，所以要求变量不可变

// ✅ 正确：使用 AtomicInteger（线程安全的可变容器）
AtomicInteger count = new AtomicInteger(0);
list.forEach(item -> count.incrementAndGet());
```

---

## 6. 面试高频问题

**Q：Lambda 表达式能访问外部变量吗？**
> 可以，但外部变量必须是 **effectively final**（事实上不可变）。原因：Lambda 可能在不同线程中执行，如果允许修改外部变量会有并发问题；Lambda 捕获的是变量的副本（值），而非引用，所以要求变量不可变。

**Q：Lambda 和匿名内部类有什么区别？**
> 1. Lambda 只能替代函数式接口（单抽象方法接口）的匿名内部类；2. Lambda 中的 `this` 指向外部类，匿名内部类中的 `this` 指向匿名内部类本身；3. Lambda 没有自己的作用域，匿名内部类有独立作用域。

---

## 7. 工作中常见坑

### ❌ 坑1：在 Lambda 中修改外部变量（effectively final 问题）

```java
// ❌ 编译报错：count 在 Lambda 外被修改
int count = 0;
list.forEach(item -> {
    if (item.isValid()) count++; // Variable used in lambda should be effectively final
});

// ❌ 同样报错：即使在 Lambda 外修改也不行
int count = 0;
list.forEach(item -> System.out.println(count)); // 如果后面有 count = 1 就报错

// ✅ 方案1：用 AtomicInteger（线程安全场景）
AtomicInteger count = new AtomicInteger(0);
list.forEach(item -> { if (item.isValid()) count.incrementAndGet(); });

// ✅ 方案2：用 Stream 的 filter + count（更函数式）
long count = list.stream().filter(Item::isValid).count();
```

### ❌ 坑2：Lambda 中的异常处理

```java
// ❌ 问题：Lambda 内部抛出 Checked Exception，编译报错
// 因为 Function<T,R> 的 apply 方法没有声明 throws
list.stream()
    .map(path -> Files.readString(path))  // 编译报错：IOException 未处理
    .collect(Collectors.toList());

// ✅ 方案1：在 Lambda 内部 try-catch（代码丑但直接）
list.stream()
    .map(path -> {
        try {
            return Files.readString(path);
        } catch (IOException e) {
            throw new RuntimeException(e);  // 包装为 RuntimeException
        }
    })
    .collect(Collectors.toList());

// ✅ 方案2：抽取工具方法，统一包装
@FunctionalInterface
interface ThrowingFunction<T, R> {
    R apply(T t) throws Exception;
}

static <T, R> Function<T, R> wrap(ThrowingFunction<T, R> f) {
    return t -> {
        try { return f.apply(t); }
        catch (Exception e) { throw new RuntimeException(e); }
    };
}

list.stream()
    .map(wrap(Files::readString))  // 干净
    .collect(Collectors.toList());
```

### ❌ 坑3：方法引用与 null 的问题

```java
// ❌ 危险：list 中有 null 元素时，方法引用会 NPE
List<String> names = Arrays.asList("Alice", null, "Bob");
names.stream()
    .map(String::toUpperCase)  // null.toUpperCase() → NPE！
    .collect(Collectors.toList());

// ✅ 先过滤 null
names.stream()
    .filter(Objects::nonNull)
    .map(String::toUpperCase)
    .collect(Collectors.toList());
```

### ❌ 坑4：Lambda 持有外部对象引用导致内存泄漏

```java
// ❌ 危险：Lambda 持有 this 引用，如果 Lambda 被长期持有（如注册到事件总线），
// 会导致外部对象无法被 GC 回收
public class OrderService {
    private List<Order> orders = new ArrayList<>();

    public void register() {
        // Lambda 隐式持有 OrderService.this 的引用
        eventBus.subscribe(event -> orders.add(event.getOrder()));
        // 如果 eventBus 生命周期比 OrderService 长，OrderService 永远不会被 GC
    }
}

// ✅ 注意及时取消订阅，或使用弱引用
```

<!-- nav-start -->
---

[⬅️ 上一篇：AQS 与 CAS](06-AQS与CAS.md) | [🏠 返回目录](../README.md) | [下一篇：Stream 流式编程 ➡️](08-[Java8]Stream流式编程.md)

<!-- nav-end -->
