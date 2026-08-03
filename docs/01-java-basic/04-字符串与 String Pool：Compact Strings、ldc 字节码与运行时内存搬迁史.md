---
doc_id: java-字节码-字符串底层原理
title: 字符串与 String Pool：Compact Strings、ldc 字节码与运行时内存搬迁史
---

# 字符串与 String Pool：Compact Strings、ldc 字节码与运行时内存搬迁史

在 Java 的世界里，`java.lang.String` 是高频使用的对象。由于其不可变性（Immutability）与编译期优化特性，几乎所有开发者都能对"字符串常量池"说上几句。但这种表象上的熟悉，往往伴随着大量过时的认知。

你是否真正直面过这些现象：

- 为什么同样是存储 `"hello"`，JDK 9+ 的项目比 JDK 8 能省下近一半的字符串内存？
- 过去教科书里天天批判的 `a + b` 字符串拼接，在现代 JDK 17/21 里为什么不再需要手动改成 `StringBuilder`？
- 为什么在高并发场景下盲目调用 `string.intern()`，不仅没能减少内存占用，反而把 GC 停顿时间拉长了数倍？

本篇是战役一的第三场字节码考古，梳理 `java.lang.String` 在数个 LTS 版本间的底层演进——从 `ldc` 指令、`invokedynamic` 拼接，到 Compact Strings 的字节数组瘦身与 StringTable 的搬迁史。

---

## 1. 业务痛点与无感知内存通胀

### 1.1 堆内存的"隐形通胀"

在企业级系统（如日志处理、微服务网关、配置中心等）的生产环境中，排查内存问题时，经常会使用 `jmap -histo` 查看对象直方图，或导出 Heap Dump 后借助 MAT 进行分析。实践中可以发现，`java.lang.String` 往往是堆中数量最多或占用内存最多的对象类型之一。同时，许多业务场景（如 JSON 键名、HTTP Header、状态码、城市名、配置项等）会产生大量内容相同的字符串副本，从而造成额外的内存占用。这类重复字符串正是 JVM 引入 **String Deduplication（字符串去重）** 等优化机制的重要应用场景。

更关键的是，大量业务字符串（如日志级别、HTTP Header、JSON 键名、状态码、URL 等）仅包含 **Latin-1** 字符。在 JDK 8 中，`String` 底层采用 `char[]` 存储，每个 UTF-16 代码单元固定占用 2 字节。对于这些仅包含 Latin-1 字符的字符串，其 UTF-16 编码的高字节始终为 0，却仍需占用完整的 2 字节存储空间，造成了不必要的内存浪费。正因如此，JDK 9 在 JEP 254 中引入了 **Compact Strings**：将底层存储改为 byte[]，并通过一个额外的 coder 字段标识采用 Latin-1 还是 UTF-16 编码，从而显著降低大量字符串的内存占用。

### 1.2 `intern()` 的使用边界：动态数据滥用带来的性能塌方

面对海量重复字符串造成的内存膨胀，一种常见的"优化"思路是用 `string.intern()` 把动态变量塞入字符串常量池去重合并：

```java
// ⚠️ 危险做法：对完全不可控的动态数据调用 intern()
while ((line = reader.readLine()) != null) {
    String untrustedId = parseId(line).intern(); // 线上雪崩的导火索
    process(untrustedId);
}
```

这段代码上线后，在小规模数据测试时内存确实大幅下降。但一旦遭遇海量动态用户 ID 涌入的生产流量，系统吞吐量会显著下降、CPU 飙升到 100%、GC 停顿时间（Pause Time）明显拉长，最终整个微服务出现严重卡顿。

真正的原因在字节码与运行时数据结构层——我们需要下沉到 `ldc` 指令、`StringTable` 的哈希桶大小与搬迁史，才能解释清楚这段代码为什么把系统拖垮。

### 1.3 循环拼接的老问题：现代 JDK 也不能完全免疫

另一个在代码审查中经常被点名的问题，是循环体内的字符串直接拼接：

```java
// ❌ 生产反模式：循环体内的直接拼接
String csv = "";
for (User user : largeUserList) {
    csv += user.getId() + ","; // 每一轮都产生一个新的中间 String
}
```

这段代码在单线程低并发下只是稍慢几毫秒，但在高并发线程池中会大量申请线程本地分配缓冲区（TLAB，Thread Local Allocation Buffer）——每一轮循环产生的临时字符串对象很快让线程当前的 TLAB 用尽，触发 JVM 回退到共享 Eden 的慢路径分配（`slow-path allocation`），伴随着更频繁的 Young GC。整个微服务集群会因这类瞬时对象的堆积出现响应抖动。

> 📌 **常见误解澄清**：不少材料把 TLAB 描述为"队列"或"引发全局内存锁"，这两种说法并不准确。TLAB 是每个线程私有的一段连续 Eden 区内存（bump pointer 分配），用尽时线程会以 CAS 方式从共享 Eden 申请新的 TLAB；这是慢路径而非"全局锁"，真正的锁竞争主要发生在 Eden 不足以再切出新 TLAB、被迫触发 Young GC 时。

这个问题的现代解法与 JDK 8 时代不同——JDK 9 起 `+` 拼接被翻译成 `invokedynamic`。但单条语句的优化并不能覆盖循环场景，具体差别在 §2.2 展开。

## 2. 字节码考古——`ldc` 指令与拼接演进

在 Class 二进制文件中，字符串字面量（Literal）并不以 Java 对象的形态存在，而是以 `CONSTANT_String_info` 的结构位于类文件的常量池（Constant Pool）中。

### 2.1 面试常题：`new String("abc")` 究竟创建了几个对象？

用 `javap -c` 反编译这段经典代码，直接看 JVM 的指令层：

```java
public void createString() {
    String s = new String("abc");
}
```

```volt
public void createString();
  Code:
   0: new           #2                  // class java/lang/String
   3: dup
   4: ldc           #3                  // String abc
   6: invokespecial #4                  // Method java/lang/String."<init>":(Ljava/lang/String;)V
   9: astore_1
  10: return
```

结合字节码看，答案是 **"1 个或 2 个"**：

1. **`0: new` 指令**：在 Java 堆内存中开辟一块空壳对象空间（分配了 String 对象的类头和字段槽位，这是第 1 个对象）。
2. **`4: ldc` 指令（Load Constant）**：从运行时常量池取字面量。若该字符串在全局字符串常量池（StringTable）中不存在，JVM 就在堆中创建字面量对象（第 2 个对象）并将引用压入栈顶；若已存在，`ldc` 直接复用已有引用，不再创建对象。
3. **`6: invokespecial` 指令**：调用构造方法，将 `ldc` 压入的字面量对象引用作为参数，初始化 `new` 出来的那个壳对象。

也就是说，`new String("abc")` 产生的对象，本质上是一个在堆中独立分配、内部持有常量池字面量引用的**包装对象**。

!!! note "📖 术语家族：`ldc` 加载常量指令族"
    **字面义**：`ldc` = Load Constant，把常量池的一项压入操作数栈顶。

    **在 JVM 中的含义**：所有 `String` / `Class` / `MethodHandle` / `MethodType` / `int` / `float` 字面量的加载入口。

    **同家族成员**：

    | 成员 | 作用 | 常量池索引宽度 | 可加载类型 |
    | :-- | :-- | :-- | :-- |
    | `ldc` | 加载常量到栈顶 | 1 字节（索引 ≤ 255） | `int` / `float` / `String` / `Class` / `MethodHandle` / `MethodType` / `Dynamic` |
    | `ldc_w` | 宽索引版本 | 2 字节（索引 > 255） | 同 `ldc` |
    | `ldc2_w` | 宽索引 + 双字长 | 2 字节 | `long` / `double`（占 2 个栈槽） |

    **命名规律**：`_w` = wide index（宽索引），`2` = 双字长（long/double 各占两个栈槽）。三条指令的分工完全由"常量池索引大小 + 值宽度"两个维度决定，`javap` 里看到具体哪一条即可反推常量池规模。

    **易混点**：`String s = "abc"` 走 `ldc`，直接把常量池里 `CONSTANT_String_info` 指向的字面量对象引用压栈；`new String("abc")` 则是 `new + dup + ldc + invokespecial` 四条指令的组合——`ldc` 只负责取字面量对象，`new` 才是那个多创建出的"套壳对象"来源。

### 2.2 拼接机制的演进：从 `StringBuilder` 到 `invokedynamic`

同样是一行最普通的 `String s = a + b + c;`，在不同的 JDK 版本下编译器生成的字节码不一样。

1. JDK 8 时代：显式 `StringBuilder`。在 JDK 8 及以前，编译器将 `+` 拼接翻译为 `StringBuilder` 链式调用：

    ```text
    // JDK 8 反编译字节码片段 (a + b + c)
    0: new           #2                  // class java/lang/StringBuilder
    3: dup
    4: invokespecial #3                  // Method java/lang/StringBuilder."<init>":()V
    7: aload_1                           // 加载变量 a
    8: invokevirtual #4                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
    11: aload_2                           // 加载变量 b
    12: invokevirtual #4                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
    15: invokevirtual #5                  // Method java/lang/StringBuilder.toString:()Ljava/lang/String;
    ```

    - **对应 §1.3 的循环拼接问题**：每一次 `+=` 都会重新执行 `new StringBuilder`，循环体内产生大量瞬时死掉的中间对象。

2. JDK 9 及以后：`invokedynamic`（简称 indy）。从 JDK 9 开始直到现代的 JDK 17 / 21，反编译同样的拼接代码会发现：**所有的 `StringBuilder`、所有的 `append()` 字节码都不见了**，取而代之的是一条动态绑定指令：

    ```text
    // 现代 JDK (9/17/21) 反编译字节码片段 (a + b + c)
    0: aload_1                           // 加载变量 a
    1: aload_2                           // 加载变量 b
    2: aload_3                           // 加载变量 c
    3: invokedynamic #4,  0              // 动态生成拼接调用点
        // 真实调用指向：java/lang/invoke/StringConcatFactory.makeConcatWithConstants
    ```

> 📖 `invokedynamic` 三件套（`CallSite` / `BootstrapMethod` / `StringConcatFactory.makeConcatWithConstants`）家族详见 [[Java8] 函数式编程](@java-字节码-函数式编程) §2.1，本文不再重复展开。

编译器在编译时不再硬编码使用 `StringBuilder`，而是将拼接逻辑打包，通过 `invokedynamic` 指令在运行时（Runtime）交给虚拟机的引导方法（Bootstrap Method）—— `StringConcatFactory.makeConcatWithConstants`。

- **动态绑定的意义**：JVM 在第一次运行到这里时，根据当前硬件与上下文环境动态生成具体的拼接策略（可能直接通过 `MethodHandle` + `Unsafe` 向内存块写字节）。这种设计的实际价值在于：将"语法拼写"与"底层实现"解耦——旧代码不需重新编译，升级 JDK 就能享受新的拼接实现。

需要看清一个边界：`invokedynamic` 只能优化**单条可一次性确定上下文**的拼接。一旦需要拼接的项数、项内容取决于循环或分支（具体不同实例化方式在 §4.1 展开），就已超出 `invokedynamic` 的作用域，必须手写 `StringBuilder`。

字节码的优化只解决了“行为层面的高效“，而 §1.1 与 §1.2 提到的内存膨胀与系统卡顿，需要进入 JVM 运行时内存布局层才能看清。

---

## 3. 内存布局——Compact Strings 与 StringTable 搬迁史

在上一层的字节码考古中，我们看到了 `invokedynamic` 对字符串拼接行为的重塑。但这些优化后的指令把字符串真正塞进 JVM 运行时内存（Runtime Memory）时，仍要面对两个约束：**内存空间的占用与垃圾回收的效率**。

围绕这两个约束，Java 在数个 LTS 版本间完成了两次底层变革。

### 3.1 紧凑字符串（Compact Strings）：取消双倍空间占用

如 §1.1 所述，传统 Java 环境下的字符串存在双倍内存开销问题。对比 JDK 8 与 JDK 9+ 的核心源码，可以看到 `String` 内部结构的改变：

```java
// ❌ JDK 8 及以前的传统内存布局：ASCII 字符存在空间浪费
public final class String implements java.io.Serializable, Comparable<String>, CharSequence {
    private final char value[]; // 每个字符占 2 字节（16 位，UTF-16 编码）
}

// ✅ JDK 9 到现代 JDK 21+ 的紧凑布局（Compact Strings）
public final class String implements java.io.Serializable, Comparable<String>, CharSequence {
    private final byte[] value; // 改为字节数组，按需分配
    private final byte coder;   // 状态位：0 代表 Latin-1 (ASCII)，1 代表 UTF-16
}
```

在 JDK 8 中，即使字符串里只有一个英文字母 `'a'`，底层的 `char[]` 仍需 2 个字节。而实际应用中，海量业务字符串（JSON 键、URL 路径、数字状态码）大部分由单字节的 Latin-1（ASCII）字符组成，导致 **50% 的数组内存被无意义的零字节（Padding Zero）填充**。

JDK 9 引入的 **Compact Strings** 在 `String` 内部增加了一个 1 字节的 `coder` 标志位：内容全为英文字符时 `coder = 0`，底层 `byte[]` 以 1 字符 = 1 字节存储；一旦混入非 Latin-1 字符（如中文），`coder = 1`，回退到 UTF-16 编码。

下面是 64 位 HotSpot（开启指针压缩 Compressed Oops）下的字符串对象字长（Word-Aligned）布局：

```txt
堆内存对象布局图（64位 JVM 开启指针压缩）:

存储内容：字面量 "Java" (共 4 个英文字符)

JDK 8 内存布局:
┌───────────────────────────┬───────────────────────────┐
│       Mark Word (8B)      │     Klass Pointer (4B)    │  ← 对象头 (12B)
├───────────────────────────┼───────────────────────────┤
│       hash int (4B)       │     char[] 引用指针 (4B)   │  ← 实例数据 (8B)
├───────────────────────────┴───────────────────────────┤
│  对齐填充Padding (4B) [为了凑齐 8 字节的整数倍]            │  ← (4B)
└───────────────────────────────────────────────────────┘  → 字符串壳对象共占 24 字节
     │
     └─► 指向独立的 char[] 数组（包含对象头 16B + 4 个字符共 8B + 0B 填充 = 24B）
         【实际代价：24B 壳 + 24B 数组 = 48 字节】

JDK 9+ 内存布局 (Compact Strings):
┌───────────────────────────┬───────────────────────────┐
│       Mark Word (8B)      │     Klass Pointer (4B)    │  ← 对象头 (12B)
├───────────────────────────┼───────────────────────────┤
│       hash int (4B)       │     byte[] 引用指针 (4B)   │  ← 实例数据 (8B)
├───────────────────────────┬───────────────────────────┤
│       coder byte (1B)     │  对齐填充 Padding (3B)      │  ← 实例数据+填充 (4B)
└───────────────────────────┴───────────────────────────┘  → 字符串壳对象同样占 24 字节
     │
     └─► 指向紧凑的 byte[] 数组（包含对象头 16B + 4 个字符共 4B + 4B 填充 = 24B）
         【当前短字符串看似与 JDK 8 相同，但长字符串/大量字符串下可省约一半内存】
```

注：对于只有 4 个字符的极短字符串，由于 JVM 存在 8 字节对齐填充（Padding）的硬性规定，数组最少分配 24 字节，看似两者相同。但只要字符串长度超过 4（例如长度为 8 的英文字符串，JDK 8 需 16B 字符 + 16B 对象头 = 32B，而 JDK 9+ 仅需 8B 字符 + 16B 对象头 = 24B），Compact Strings 在大量存活对象的堆中，就能为微服务集群减少 30% 以上的整体内存开销。

### 3.2 StringTable 从永久代（PermGen）搬回堆

现在回到 §1.2 的悬念：为什么对不可控的动态数据高频调用 `string.intern()` 会拉满 CPU、引发 GC 停顿与系统卡顿？这需要了解 `StringTable` 在 JVM 演进中的搬迁。

在虚拟机内部，实现字符串常量池去重的核心组件是 **`StringTable`**，本质上是一个由 C++ 编写、默认固定容量的**本地哈希表（Native HashTable）**。

```txt
JVM 常量池跨代引用变迁史 (StringTable Translocation)

JDK 6 时代:
┌───────────────────────────────────────────────┐
│ 永久代 (PermGen - 非堆内存，大小固定)             │
│ ┌───────────────────────────────────────────┐ │ ❌ 缺陷：对不可控的动态数据调用 intern()，
│ │ StringTable (Native C++ HashTable)        │ │   字面量会占满固定大小的永久代，
│ └───────────────────────────────────────────┘ │   引发 java.lang.OutOfMemoryError: PermGen space
└───────────────────────────────────────────────┘

JDK 7 到现代 JDK 21+ 时代:
┌─────────────────────────────────────────────────┐
│ Java 堆内存 (Java Heap - 受 GC 管理与动态扩容)      │
│ ┌───────────────────────────────────────────┐   │ ✅ StringTable 搬入主堆内存，
│ │ StringTable ──► 内部指针直接指向普通的堆对象   │   │   可被主垃圾回收器（G1/ZGC）回收。
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

从 JDK 7 开始，JVM 将 `StringTable` **整体搬迁到 Java 堆内存（Java Heap）中**，一至现代 JDK 21。这一变化带来的关键结果是：**常量池中的字符串引用可以被主垃圾回收器管理了**。

**§1.2 卡顿案现场复盘**

既然已搬回堆内存，为什么 §1.2 中对不可控的用户动态输入调用 `intern()` 仍会引发生产问题？

1. **哈希碰撞导致查找退化**：`StringTable` 在 HotSpot 内部是一个固定容量的哈希表（JDK 7 默认 60013，可通过 `-XX:StringTableSize` 调整）。当 §1.2 中的代码将海量、完全不重复的动态用户 ID 调用 `intern()` 塞入常量池时，元素数量会暴增到数百万。
2. **O(1) 退化为 O(N)**：总桶数固定、元素密集，导致大量**哈希冲突（Hash Collision）**。哈希表本应的 \(O(1)\) 查找时间退化为**单链表线性遍历 \(O(N)\)**。
3. **拖累到普通 `ldc` 与 GC**：此后每次普通 `ldc`（例如加载一个类、或运行一行包含字符串字面量的代码）也需拿着字符串到百万链表长度的 `StringTable` 里线性遍历；大量 CPU 时钟周期消耗在 C++ 的哈希链表遍历上。GC 在尝试回收常量池时，也必须对这个膨胀的哈希表进行长时间的扰动扫描，最终表现为高延迟与奇长 Pause Time。

所以，`StringTable` 搬回堆不代表它就变成了一个普通容器：它仍是 **Native 固定桶数** 的哈希表，只适合存放数量可控、高频重复的少量字符串（枚举类的业务状态码、JSON Key）；任何把它当作一般去重 Map 的用法都会遭遇 O(N) 卡顿。

---

## 4. 工程红线与高并发文本处理

在现代微服务与高并发的工程落地中，下面三条针对字符串的工程红线需要建立并严守。

### 4.1 🚨 工程红线 1：严禁循环体内高频 += 拼接

如 §2.2 所说，现代 JDK（9/17/21）虽然将显式 `StringBuilder` 拼接换成了 `invokedynamic`，但：**`invokedynamic` 的动态拼接优化，作用域仅限于单条语句或可一次性确定的上下文**。

```java
// ❌ 仍有问题的反模式：即使在 JDK 17 下，循环仍会造成内存压力
String report = "";
for (int i = 0; i < 10000; i++) {
    report += "data_" + i; // 每一轮循环仍会产生一个新的 invokedynamic 调用点和新字符串
}
```

**推荐做法**：循环、多行、或其他不能一次性确定上下文的拼接场景，需回退到显式 `StringBuilder`，并为其提供合理的初始容量（Initial Capacity），避免频繁扩容带来的内存拷贝。

```java
// ✅ 推荐写法：显式容器 + 预估容量
StringBuilder sb = new StringBuilder(10000 * 12); // 预分配容量，避免多次扩容
for (int i = 0; i < 10000; i++) {
    sb.append("data_").append(i);
}
String report = sb.toString();
```

### 4.2 🚨 工程红线 2：严禁对未洗净的外部动态数据滥用 intern()

经过 §3.2 的分析，`StringTable` 适用于数量可控、高频重复的枚举类数据（国家代码、有限的业务状态机、固定的 JSON Key），不适合任意动态数据。

- **红线**：任何来自外部网络请求、MQ 消息、用户动态输入的流数据，都不应当直接调用 `intern()`。

    ```java
    // ⚠️ 危险做法：对完全不可控的动态数据调用 intern()
    while ((line = reader.readLine()) != null) {
        String untrustedId = parseId(line).intern(); // 线上雪崩的导火索
        process(untrustedId);
    }
    ```

- **应用层去重替代方案**：如果确需对数百万的动态高频字符串去重合并，应在应用层使用 Guava 的 `Interners.newWeakInterner()`，或自建一个大小受限、支持淘汰的 `ConcurrentHashMap`。让去重行为发生在自己的堆内对象上，而不是 Native `StringTable`。

    ```java
    // ✅ 推荐做法：应用层受控去重容器（Guava Interners，弱引用可回收）
    import com.google.common.collect.Interner;
    import com.google.common.collect.Interners;

    // 底层是弱引用 ConcurrentHashMap，Key 不再被强引用后可被 GC 回收，
    // 与 JVM StringTable 的强引用 + Native HashTable 语义完全隔离。
    private static final Interner<String> ID_POOL = Interners.newWeakInterner();

    while ((line = reader.readLine()) != null) {
        String canonicalId = ID_POOL.intern(parseId(line)); // 应用层去重，不触碰 StringTable
        process(canonicalId);
    }
    ```

    若不引入第三方库，用 `ConcurrentHashMap` + 容量上限 + LRU 淘汰也可以自建等价容器，核心是：**去重表在堆内可见、可测、可清空、可淘汰**，而 `String.intern()` 三样都做不到。

- **JVM 侧的优化开关**：如果系统确实存在海量重复字符串，且使用的是 **G1** 或 **ZGC**，可在启动参数中开启 `-XX:+UseStringDeduplication`。G1/ZGC 在后台并发标记（Concurrent Mark）时，若发现两个 `String` 对象底层 `byte[]` 内容相同，会将两个壳对象指向同一份底层数组、回收冗余数组。整个过程在 GC 后台完成，不产生 `StringTable` 的链表扰动代价。

### 4.3 🚨 工程红线 3：不可变性（Immutability）与内存擦除的权衡

把 `String` 设计为 `final`（不可变）常被解释为"服务于字符串常量池复用"，但这只是它多重意义中的一个。从安全视角看，不可变性同时带来一项确定性保障与一项避不开的代价，需要分别看待。

1. **不可变性作为完整性保障**

    当数据库连接 URI、文件路径、鉴权 Token 等安全敏感信息以 `String` 形式在系统中层层传递时，不可变性保证这些值在整个生命周期中不会被意外或恶意修改：

    ```java
    String dbUrl = "jdbc:mysql://prod-server:3306/users?token=SECRET";
    // 无论这个引用被传递到多少个线程、多少层方法调用，
    // 其内部字符序列始终不变——没有任何 Java 代码能篡改它指向的内容。
    // 这是 JVM 层面的保证，与并发安全无关、与访问控制无关，纯粹由类型系统强制执行。
    ```

    这项保障只解决完整性问题——防止值被改写，不解决其他安全维度。

2. **不可变性作为内存擦除的障碍**

    恰恰因为 `String` 无法被修改，当你用它存储密码时，会引发另一个安全问题：用完之后，你没有任何办法主动清除它在内存中的痕迹。

    ```java
    // 问题做法：用 String 存储密码
    String password = request.getParameter("password");
    authenticate(password);
    // password 的 backing array（JDK 8 是 char[]，JDK 9+ 是 byte[]）
    // 仍然完整地保留在堆内存中，直到 GC 在某个不确定的时间点回收它。
    // 在这个窗口期内，任何能读取堆内存的手段（heap dump、核心转储、
    // 内存映射漏洞）都可以直接获取明文密码。
    ```

    ```java
    // 规范做法：用 char[] 存储，并在使用后立即擦除
    char[] passwordBuffer = request.getParameter("password").toCharArray();
    authenticate(passwordBuffer);
    Arrays.fill(passwordBuffer, '\0'); // 立即将缓冲区清零
    ```

    `Arrays.fill` 会把该数组对应的内存区域覆写为零值。这意味着即使此后发生了 heap dump，这段内存中残留的也不再是密码原文。

工程纪律：在安全敏感的密钥管理模块中，使用 `char[]` 替代 `String` 来存储密码和密钥，是一个有充分技术依据的行业惯例，Java 核心 API 的设计本身就体现了这一点——`javax.security.auth.callback.PasswordCallback#getPassword()` 返回的正是 `char[]` 而非 `String`，`javax.crypto.spec.PBEKeySpec` 的构造器也只接受 `char[]` 作为密码入参。JDK 官方 API 用签名本身把这条约束写进了类型系统。但这条规范对执行场景有明确的边界要求——它对密码学组件是必要的工程纪律，对普通业务模块则是推荐实践而非强制红线。团队应根据自身的威胁模型决定其优先级。

---

## 5. 🗺️ 跨战役知识伏笔

本章中我们在研究 `String` 的内存膨胀、Compact Strings 布局与 StringTable 搬迁时，所有的内存操作、引用复制、以及字节数组的流转，都发生在 JVM 的**堆内存（Java Heap）**边界之内。

到了战役五的 [Java NIO 与 IO 模型](@java-OS-NIO与IO模型)，当需要追求单机十万并发、触及操作系统内核的零拷贝（Zero-Copy）时，就要**跨出 Java 堆、在内核空间上开辟堆外直接内存（`DirectByteBuffer`）**。到那时，本篇里的 `byte[]` 字节排列将直接通过 `mmap` 与 `sendfile` 系统调用，在网卡与磁盘总线上传输。
