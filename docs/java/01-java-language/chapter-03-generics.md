# 泛型

> 泛型只做两件事：**编译期检查类型**，**运行期擦除类型**。抓住这两件事，`List<String>` 为什么不是 `List<Object>`、为什么不能 `new T()`、桥接方法从哪来——这些看似零散的知识点，都能顺着两条线推出来。本章先立住这个根，再展开它分出的两条枝。

## 1. 为什么需要泛型：从 Object 到类型安全

### 1.1 Java 5 之前的问题

泛型出现之前，Java 的集合类只能存储 `Object`：

```java
List list = new ArrayList();
list.add("hello");
list.add(123);           // 可以混入任何类型
list.add(new Date());    // 什么都能放

// 读取时必须强制转型
String s = (String) list.get(0);  // OK
String s2 = (String) list.get(1); // ClassCastException！运行时崩溃
```

这段代码暴露三个问题：

1. **强制类型转换**：每次从集合取出元素都要强转，代码冗余
2. **运行时错误**：类型错误只能在运行时发现，编译器帮不了你
3. **无法表达类型约束**：`List` 不能表达"这个列表只能放 String"

### 1.2 泛型的解决方案

Java 5 引入泛型后：

```java
List<String> list = new ArrayList<>();
list.add("hello");
list.add(123);           // 编译错误！编译器直接拒绝
```

核心动作只有一句：**把类型检查从运行期提前到编译期**。编译器在编译时就验证类型安全，从源头消除运行时的 `ClassCastException`。

这句"编译期检查"先记住——它是第 4 章所有类型规则的来源。

## 2. 泛型类与泛型方法的定义

理解了"为什么需要泛型"，接下来解决"怎么写"。泛型可以用在类和方法两个层面。

### 2.1 泛型类

在类名后面加类型参数，类内部就可以使用这个类型：

```java
public class Box<T> {
    private T value;

    public Box(T value) {
        this.value = value;
    }

    public T getValue() {
        return value;
    }

    public void setValue(T value) {
        this.value = value;
    }
}

// 使用
Box<String> stringBox = new Box<>("hello");
String s = stringBox.getValue();  // 不需要强制转换

Box<Integer> intBox = new Box<>(42);
Integer i = intBox.getValue();
```

`<T>` 是类型参数，使用时传入具体类型（如 `String`），编译器保证类型安全。

多个类型参数用逗号分隔：

```java
public class Pair<K, V> {
    private K key;
    private V value;

    public Pair(K key, V value) {
        this.key = key;
        this.value = value;
    }
    // getter/setter 省略
}

Pair<String, Integer> entry = new Pair<>("age", 25);
```

### 2.2 泛型方法

方法也可以有自己的类型参数——注意是**方法自己的**类型参数，不是类的：

```java
public class Util {
    // 泛型方法：<T> 声明在返回类型之前
    public static <T> void printArray(T[] array) {
        for (T element : array) {
            System.out.println(element);
        }
    }
}

// 使用：类型推断，不需要显式指定
String[] names = {"Alice", "Bob"};
Util.printArray(names);  // 编译器推断 T = String
```

**类类型参数 vs 方法类型参数的区别**：

```java
public class Box<T> {
    // T 是类的类型参数，所有方法都能用
    private T value;

    // 这个方法用的是类的 T
    public T getValue() { return value; }

    // <U> 是方法自己的类型参数，只有这个方法能用
    public <U> void inspect(U other) {
        System.out.println("T: " + value + ", U: " + other);
    }
}

Box<String> box = new Box<>("hello");
box.inspect(42);  // U 是 Integer，T 是 String，互不影响
```

### 2.3 有界类型参数

类型参数可以加约束，限制传入的类型范围：

```java
// T 必须是 Comparable 的实现类
public static <T extends Comparable<T>> T findMax(T[] array) {
    T max = array[0];
    for (T element : array) {
        if (element.compareTo(max) > 0) {
            max = element;
        }
    }
    return max;
}

Integer[] nums = {3, 1, 4, 1, 5};
Integer max = findMax(nums);  // 5

// findMax(new Object[]{...})  // 编译错误！Object 没有实现 Comparable
```

`<T extends Comparable<T>>` 的含义：T 必须实现 `Comparable<T>` 接口。`extends` 在这里表示"上界"，既可以是类也可以是接口（多个约束用 `&` 连接）：

```java
// 多个约束
public static <T extends Serializable & Comparable<T>> void process(T item) { ... }
```

### 2.4 泛型构造方法

构造方法也可以有自己的类型参数（虽然少见）：

```java
public class Event<T> {
    private T data;

    // 泛型构造方法：方法自己的 <T> 遮蔽了类的 <T>
    public <T> Event(T data) {
        this.data = (T) data;  // 注意：这里的 T 是方法的 T，不是类的 T
    }
}
```

实际上这种情况很少用到，知道即可。

## 3. 类型擦除：泛型的核心设计

前两章讲了泛型"为什么"和"怎么写"。这一章解决"它到底怎么实现的"——这是理解泛型一切行为的根。

### 3.1 一个反直觉的事实

```java
List<String> strings = new ArrayList<>();
List<Integer> integers = new ArrayList<>();

strings.getClass() == integers.getClass()  // true!
```

运行时，`List<String>` 和 `List<Integer>` 是同一个类。这说明：**泛型信息在编译完成后就消失了**。这一节解释它消失到哪、为什么这样设计。

### 3.2 擦除的机制

编译器在编译时检查类型安全，然后在生成的字节码中**移除泛型类型参数**，替换为它们的上界（默认是 `Object`）：

```java
// 源码
public class Box<T> {
    private T value;
    public T getValue() { return value; }
    public void setValue(T value) { this.value = value; }
}

// 编译后（擦除后）
public class Box {
    private Object value;
    public Object getValue() { return value; }
    public void setValue(Object value) { this.value = value; }
}
```

擦除发生在"上界"处：`<T extends Number>` 的 T 被擦成 `Number`，无界的 `T` 被擦成 `Object`。

### 3.3 为什么选择擦除

原因只有一个：**向后兼容**。

Java 5 引入泛型时，已有大量用 Java 4（没有泛型）编写的代码和库在运行。擦除让 JVM 和字节码格式都不必改变——旧 JVM 能直接运行带泛型的新代码，因为字节码里泛型信息已被擦掉。

这个选择务实，但有代价：`int` 不能作类型参数、不能 `new T()`、不能 `instanceof List<String>`。这些限制（第 5 章）和编译器的补救措施（第 6 章），根源都是同一件事——运行时没有 T。

### 3.4 一条主线，两条枝

至此，泛型的全貌可以概括成一张图：

```txt
Java 泛型 = 编译期检查 + 运行期擦除
            │               │
            │               └─→ 运行时没有 T
            │                    ├─ 第 5 章：各种限制
            │                    └─ 第 6 章：编译器的补救
            └─→ 编译期必须保证类型安全
                 └─ 第 4 章：不变性 / 协变 / 逆变 / PECS
```

后面每一章，都挂在其中一条枝上。往下读时，对照这张图，把每一章归到它所属的枝上。

## 4. 编译期检查推出的类型规则

这一章的所有规则，都来自第 1 章结尾那句"编译期必须保证类型安全"。它们不是独立条文，而是同一个要求在不同场景下的推论。

### 4.1 不变性：为什么 List\<String\> 不是 List\<Object\>

直觉上，既然 `String` is-a `Object`，那 `List<String>` 应该也是 `List<Object>`。

**不是。** 如果允许：

```java
List<String> strings = new ArrayList<>();
List<Object> objects = strings;   // 假设允许
objects.add(123);                 // 往 String 列表里塞了一个 Integer！
String s = strings.get(1);       // ClassCastException
```

一旦允许 `List<String>` 赋值给 `List<Object>`，编译期检查就被攻破了：类型错误又回到了运行期。所以 Java 让泛型默认**不变（Invariant）**：

```java
List<String> list = new ArrayList<>();  // OK
List<Object> objects = list;            // 编译错误！
```

不变性不是额外加的规定，它就是"编译期检查"这几个字在集合上的直接体现。

### 4.2 协变 —— `? extends`

但不变太死板。有些场景只需要读、不需要写，比如遍历打印。这时可以放宽为协变：

```java
List<? extends Number> list = new ArrayList<Integer>();  // OK
// list 可以指向 Integer 列表、Double 列表等任何 Number 子类的列表

Number n = list.get(0);   // OK，可以安全读取 Number
list.add(123);            // 编译错误！不能写入
```

为什么不能写？`list` 实际可能是 `List<Double>`，往里塞 `Integer` 就破坏了类型安全——又是"编译期检查"这一条在起作用。`? extends` 因此**只保证读安全**。

### 4.3 逆变 —— `? super`

另一种放宽方向：只需要写、不需要读。用 `? super`：

```java
List<? super Integer> list = new ArrayList<Number>();  // OK
// list 可以指向 Number 列表、Object 列表等任何 Integer 父类的列表

list.add(123);            // OK，可以安全写入 Integer
Object obj = list.get(0); // OK，但只能读取为 Object
```

为什么读只能是 `Object`？`list` 实际可能是 `List<Number>`，取出的元素可能是 `Double`，无法保证是 `Integer`。`? super` 因此**只保证写安全**。

### 4.4 PECS：两条规则合起来的工程口诀

把 4.2、4.3 的结论压缩成一句可操作的口诀，就是 Josh Bloch 在《Effective Java》里的 PECS：

- 一个泛型结构**产出**数据（Producer），用 `? extends`——只读
- 一个泛型结构**消费**数据（Consumer），用 `? super`——只写

```java
// Producer：从 list 中读取数据
public void printAll(List<? extends Number> list) {
    for (Number n : list) {    // 安全读取为 Number
        System.out.println(n);
    }
}

// Consumer：往 list 中写入数据
public void addIntegers(List<? super Integer> list) {
    list.add(1);    // 安全写入 Integer
    list.add(2);
}
```

PECS 不是新规则，它只是给 4.2、4.3 的推论起了个名字。

### 4.5 无界通配符 `?`

`List<?>` 表示"未知类型的列表"。只能读取（读出来是 `Object`），不能写入（除了 `null`）：

```java
List<?> list = new ArrayList<String>();
Object obj = list.get(0);  // OK
list.add("hello");         // 编译错误
list.add(null);            // OK，null 是任何类型的合法值
```

`?` 适合只读场景，或者你真的不关心元素类型时使用。

## 5. 运行期擦除推出的限制

第 3 章说过：运行时没有 T。这一章的每一条限制，都是这个事实的直接后果。

**不能使用基本类型：**

```java
List<int> list = new ArrayList<>();     // ❌
List<Integer> list = new ArrayList<>();  // ✅ 但有装箱开销
```

T 被擦成 `Object`，而 `int` 不是 `Object`，所以不能作类型参数。

**不能实例化类型参数：**

```java
public <T> T create() {
    return new T();  // ❌ 运行时不知道 T 是什么
}
```

**运行期类型缺失：**

```java
List<String> a = new ArrayList<>();
List<Integer> b = new ArrayList<>();
// 运行时无法区分 a 和 b 的泛型类型
```

`instanceof` 也因此失效：`list instanceof List<String>` 是编译错误，因为运行时根本没有 `List<String>` 这个类型。

## 6. 擦除的补救：编译器替你做的事

擦除带来了第 5 章那些限制，也留下两道需要修补的裂缝：读取时的强转、继承时的多态。编译器用三件事补上它们。

### 6.1 自动插入类型转换

擦除后，`list.get(0)` 返回 `Object`，编译器在读取处自动插入强转：

```java
// 源码
String s = list.get(0);

// 编译后实际为
String s = (String) list.get(0);  // 对应字节码 checkcast 指令
```

这就是为什么用泛型时读出来不用手写强转——不是运行时知道类型，而是编译器替你写了强转。

### 6.2 桥接方法（Bridge Method）

泛型与继承结合时，擦除会破坏多态：

```java
public interface Container<T> {
    void set(T value);
}

public class StringContainer implements Container<String> {
    @Override
    public void set(String value) { ... }
}
```

擦除后，`Container.set(T)` 变成 `Container.set(Object)`，而 `StringContainer.set(String)` 参数类型不同，不再是覆写——多态失效。

编译器生成一个桥接方法来修补：

```java
// 编译器生成的桥接方法
public class StringContainer implements Container<String> {
    public void set(String value) { ... }

    // 桥接方法：参数类型是 Object，内部转发给 set(String)
    @Override
    public void set(Object value) {
        this.set((String) value);  // 强制转换 + 转发
    }
}
```

桥接方法不是新概念，它只是"擦除后签名不一致"这道裂缝上的补丁。

### 6.3 Signature 属性：擦掉但没完全擦掉

运行时虽然擦除了泛型，但 Class 文件里还留了一份——存在 `Signature` 属性中，供反射和框架读取：

```java
// 通过反射获取泛型信息
public class UserRepository extends JpaRepository<User, Long> { }

Type superclass = UserRepository.class.getGenericSuperclass();
ParameterizedType pt = (ParameterizedType) superclass;
Type[] typeArgs = pt.getActualTypeArguments();
// typeArgs[0] = User.class
// typeArgs[1] = Long.class
```

Spring、MyBatis 等框架大量利用这个能力来获取泛型参数。第二卷 Class 文件章节会详细展开 `Signature` 属性的存储结构。

## 7. 泛型在框架中的应用

泛型在主流 Java 框架中无处不在：

| 框架 / 场景 | 泛型用法 | 解决的问题 |
| :-- | :-- | :-- |
| 集合框架 | `List<T>`、`Map<K,V>` | 类型安全的容器 |
| Spring | `getBean(Class<T>)` | 返回类型自动匹配 |
| MyBatis | `BaseMapper<T>` | 通用 CRUD 操作 |
| CompletableFuture | `CompletableFuture<T>` | 异步结果的类型安全 |
| Jackson | `TypeReference<T>` | 反序列化时保留泛型信息 |

以 Jackson 的 `TypeReference` 为例，它最能体现第 6.3 节的价值：

```java
// ❌ 擦除导致的问题
List<String> list = objectMapper.readValue(json, List.class);
// 返回的是 List<Object>，不是 List<String>

// ✅ TypeReference 通过匿名子类保留泛型信息
List<String> list = objectMapper.readValue(json, new TypeReference<List<String>>() {});
// 正确返回 List<String>
```

`TypeReference` 依赖 `Signature` 属性：匿名子类的 `getGenericSuperclass()` 能取回 `TypeReference<List<String>>` 的完整泛型信息。框架层的所有泛型魔法，最终都回到第 3 章那句"运行期擦除、Signature 留底"。

## 8. 未来方向（Project Valhalla）

Oracle 正在开发的 Project Valhalla 计划从根上解决擦除的代价：

- **Specialized Generics**：让泛型支持基本类型，`List<int>` 将成为可能
- **Value Types**：消除装箱开销，统一基本类型与引用类型

这些改进将从根本上改变 Java 的类型系统和性能特征，但目前仍在开发中。

> 本章以"编译期检查 + 运行期擦除"为主线：第 4 章的规则来自编译期检查，第 5、6 章的限制与补救来自运行期擦除。抓住这条主线，泛型就不再是一堆需要死记的条文。下一章《注解与 Lambda》将完成 Java 语言层的最后两块拼图：元数据驱动编程和行为抽象。
