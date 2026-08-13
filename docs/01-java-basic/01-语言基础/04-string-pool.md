---
doc_id: java-字节码-字符串底层原理
title: 字符串与 String Pool —— 字符串常量池与 Compact Strings
---

# 字符串与 String Pool —— 字符串常量池与 Compact Strings

在 Java 的世界里，`java.lang.String` 是使用频率最高的对象类型之一。由于其不可变性（Immutability）与编译期优化特性，几乎所有开发者都能对“字符串常量池”说上几句。但表象上的熟悉，往往伴随着大量过时的认知。

以下三个问题指向 `String` 在 JVM 内部的三个底层机制：
---

## 1. 为什么需要 `String` —— 业务中的文本世界

### 1.1 Java 为什么没有内建字符串类型

在 C 语言中，字符串就是 `char*` 或 `char[]`——一段以 `\0` 结尾的连续内存。这种设计的优势是零开销：不需要对象头，不需要类元数据，一个指针就够。代价是开发者需要自己管理编码、边界、拷贝和释放，`strcpy` 越界一次就能直接击穿进程。

Java 做了一个完全相反的选择：**将字符串提升为一等公民类 `java.lang.String`**。这不是因为 Java “不能”做轻量字符串，而是因为：

1. **面向对象的一致性**：字符串需要长度计算、子串查找、编码转换等操作。把这些操作挂在类上比挂在全局函数上更符合 Java 的类型体系。
2. **安全边界**：类封装意味着 JVM 可以保证没有 Java 代码能绕过 `String` 的构造函数直接篡改其内部字节数组。在类加载、文件路径解析、网络连接等安全敏感路径上，这个保证是硬需求。
3. **Unicode 时代的必然**：`char*` 的 `\0` 终止约定在 UTF-16 编码下失效（`\0` 本身就是合法字符）。需要一个独立于编码的抽象层。

Java 的 `String` 从一开始就不是“字符数组的语法糖”，而是带着类型契约和安全语义的完整抽象。这个设计决策的连锁反应贯穿本篇全部内容。

### 1.2 为什么 `String` 被设计成不可变（Immutable）

`String` 被声明为 `final class`，内部存储数组也被声明为 `private final`。不可变性不是一个“顺手加的优化”，而是多个工程约束的必然收敛：

1. **安全模型的基石**：`String` 被用于类加载（`ClassLoader.loadClass(name)`）、文件路径（`new FileInputStream(path)`）、网络连接（`new Socket(host, port)`）。如果 `String` 可变，任何拿到引用的代码都能在安全检查通过后篡改其内容，导致安全机制被绕过。
2. **字符串常量池的前提**：JVM 的 `StringTable` 通过引用共享来复用相同内容的字符串（§3 详述）。如果 `String` 可变，共享一个对象的不同引用方会相互干扰——“改了一处，别处也变了”。
3. **`hashCode` 缓存的可行性**：`String` 在第一次调用 `hashCode()` 时计算并缓存结果（`hash` 字段）。不可变保证了这个缓存永不失效，`HashMap<String, ...>` 的性能直接依赖于这个前提。
4. **并发不需要同步**：多线程共享同一个 `String` 引用时，不需要加锁——因为没有任何线程能改变它的内容。

这四条中的任何一条都不是“可选优化”，而是 Java 平台设计的硬性依赖。没有不可变性，第 2 条和第 3 条直接崩塌，第 1 条和第 4 条需要在整个标准库里追加大量防御性拷贝。

### 1.3 文本对象为什么会成为堆内存的大户

在日志处理、微服务网关、配置中心等企业级系统的生产环境中排查内存问题时，`jmap -histo` 或 Heap Dump（MAT 分析）的结论几乎总是同一张面孔：

```txt
 num     #instances         #bytes  class name
   1:       2436183      194894640  [C         ← JDK 8 的 char[]
   2:        982341       23576184  java.lang.String
```

`String`（及其底层数组）几乎是所有 JVM 堆中**数量最多或总字节数最高的对象类型**。这并非偶然——每个 JSON 键名、HTTP Header、状态码、城市名、配置项、SQL 片段，在内存里都是一条 `String` 对象。

更隐蔽的问题是**内容重复**。同一个服务中，`"SUCCESS"` 可能出现在 100 个线程的局部变量里、`"Content-Type"` 可能被 200 个 HTTP 处理函数各自 `new` 了一份。如果每份都独立分配堆内存，累积的冗余是惊人的。正因如此，JVM 设计了 **StringTable**（§3）和 **String Deduplication**（G1/ZGC 的后台字节数组去重）两级机制来应对。

此外，大量业务字符串仅包含 Latin-1 字符（英文字母、数字、基本标点）。在 JDK 8 的 `char[]` 存储下，每个字符固定占 2 字节，高字节恒为零——这是一笔纯粹的浪费。JDK 9 在 JEP 254 中引入的 **Compact Strings**（§5）正是瞄准了这个“看不见的 50%”。

---

## 2. 字符串字面量（Literal）与 `ldc` 指令

### 2.1 字符串字面量与编译期常量

在 Java 源码中，用双引号包裹的字符序列叫**字符串字面量（String Literal）**：

```java
String s1 = "hello";          // 字面量
String s2 = "hello";          // 同一个字面量 → 同一个常量池条目
String s3 = "he" + "llo";     // 编译期常量折叠 → 等价于 "hello"
```

`"he" + "llo"` 在字节码里不会留下任何拼接指令——`javac` 在语义分析阶段就完成了**常量折叠（Constant Folding）**，直接把它替换为 `"hello"`。这是 JLS §15.28（Constant Expressions）定义的编译期优化，条件很严格：参与运算的操作数必须全部是字面量或被 `final` 修饰的编译期常量。

### 2.2 字节码中的 `CONSTANT_String`

在 `.class` 二进制文件中，字符串字面量不直接存储为字符序列，而是以 **`CONSTANT_String_info`** 结构存在于常量池（Constant Pool）中。用 `javap -v` 反编译可看到常量池条目：

```text
Constant pool:
   #1 = Methodref          #7.#26         // java/lang/Object."<init>":()V
   #2 = String             #27            // hello
  ...
  #27 = Utf8               hello
```

`CONSTANT_String_info` 本身只存一个索引（指向 `CONSTANT_Utf8_info`），真正的 UTF-8 字节序列存在 `CONSTANT_Utf8_info` 中。JVM 规范（JVMS §4.4.3）对 `CONSTANT_String_info` 的语义有一条关键规定：

> 对于同一个 UTF-8 内容，常量池中只保留一份 `CONSTANT_String_info`。

这意味着 `javac` 在编译时就完成了字符串字面量的去重——源码中写了 10 次 `"hello"`，常量池中只有一条 `CONSTANT_String_info`。

### 2.3 `ldc` 指令如何加载字符串

`ldc`（Load Constant）是 JVM 字节码中负责将常量池条目压入操作数栈的指令。对于字符串字面量，`ldc` 的行为是两步：

1. 从运行时常量池取出 `CONSTANT_String_info` 指向的 UTF-8 内容；
2. 在 **第一次加载** 时，调用 `String.intern()` 将字符串对象放入 `StringTable`，然后返回该对象的引用；后续加载直接返回池中已有引用。

也就是说，`ldc` 指令的执行本身就包含了隐式的 `intern()` 调用。这是字符串常量池与类加载机制焊接在一起的底层连接点——在 §3 和 §4 中，这个连接点会反复出现。

!!! note "📖 术语家族：`ldc` 加载常量指令族"
    **字面义**：`ldc` = Load Constant，把常量池的一项压入操作数栈顶。

    **在 JVM 中的含义**：所有 `String` / `Class` / `MethodHandle` / `MethodType` / `int` / `float` 字面量的加载入口。

    **同家族成员**：

    | 成员 | 作用 | 常量池索引宽度 | 可加载类型 |
    | :-- | :-- | :-- | :-- |
    | `ldc` | 加载常量到栈顶 | 1 字节（索引 ≤ 255） | `int` / `float` / `String` / `Class` / `MethodHandle` / `MethodType` / `Dynamic` |
    | `ldc_w` | 宽索引版本 | 2 字节（索引 > 255） | 同 `ldc` |
    | `ldc2_w` | 宽索引 + 双字长 | 2 字节 | `long` / `double`（占 2 个栈槽） |

    **命名规律**：`_w` = wide index（宽索引），`2` = 双字长（long/double 各占两个栈槽）。三条指令的分工完全由“常量池索引大小 + 值宽度”两个维度决定，`javap` 里看到具体哪一条即可反推常量池规模。

    **易混点**：`String s = "abc"` 走 `ldc`，直接把常量池里 `CONSTANT_String_info` 指向的字面量对象引用压栈；`new String("abc")` 则是 `new + dup + ldc + invokespecial` 四条指令的组合——`ldc` 只负责取字面量对象，`new` 才是那个多创建出的“套壳对象”来源。

### 2.4 面试经典：`new String("abc")` 究竟创建了几个对象？

这道题几乎出现在每一份 Java 面试题库里。用 `javap -c` 反编译来看：

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

结合 §2.3 中 `ldc` 的隐式 `intern()` 语义，答案是 **“1 个或 2 个”**：

1. **`0: new` 指令**：在堆中分配 `String` 对象壳（Mark Word + Klass Pointer + 实例字段槽位）——这是第 1 个对象。
2. **`4: ldc` 指令**：从运行时常量池取字面量 `"abc"`。若该字符串不在 `StringTable` 中，`ldc` 会触发隐式 `intern()` 创建一个字面量对象并存入池中——这是第 2 个对象。若已存在，`ldc` 直接复用池中引用，不再创建新对象。
3. **`6: invokespecial` 指令**：调用构造方法，将 `ldc` 压入的字面量引用作为参数，初始化第 1 个对象的内部字段。

因此 `new String("abc")` 产生的堆对象是一个独立分配的壳 + 内部持有常量池字面量引用的组合。壳对象与池中字面量是**两个不同的对象**，前者始终在堆中新建，后者由 `StringTable` 管理复用。

---

## 3. `String Pool` —— JVM 如何复用字符串

### 3.1 什么是 `String Pool`

`String Pool`（字符串常量池）不是一个独立的 JVM 内存区域，而是一个**概念层名称**，指 JVM 内部用于存放和复用字符串字面量的机制。它的底层实现叫 **`StringTable`**——一个由 C++ 编写的 Native 哈希表，位于 HotSpot 源码 `src/hotspot/share/classfile/stringTable.cpp`。

三个容易混淆但本质不同的概念：

| 概念 | 位置 | 生命周期 | 作用 |
| :-- | :-- | :-- | :-- |
| **Class 常量池（Constant Pool）** | `.class` 文件内 | 编译期确定 | 存储 `CONSTANT_String_info` 等符号引用 |
| **运行时常量池（Runtime Constant Pool）** | 元空间（Metaspace） | 类加载时创建 | 将符号引用解析为直接引用 |
| **StringTable（String Pool）** | Java 堆（JDK 7+） | JVM 进程级，全局共享 | 存放 `intern()` 后的字符串对象，按内容去重 |

三者的关系是：`.class` 文件的常量池提供原材料 → 类加载时 `ldc` 指令触发 `intern()` → 字符串对象被写入全局 `StringTable`。

### 3.2 `StringTable` 的工作机制

当 `ldc` 指令或 `String.intern()` 被调用时，`StringTable` 按以下流程工作：

1. 计算字符串内容的哈希值（基于 UTF-16 编码的字符序列）；
2. 根据哈希值定位到对应的桶（bucket）；
3. 遍历桶内的链表，用 `String.equals()` 做精确匹配；
4. 若找到相等内容的对象，返回池中已有引用；
5. 若未找到，将当前 `String` 对象加入链表头部，返回该引用。

关键点：**去重是通过内容比较完成的，不是引用比较**。即使两个 `String` 对象是不同的堆对象，只要 `equals()` 返回 `true`，`StringTable` 就会复用其中一个。

### 3.3 `StringTable` 的 HashTable 结构

`StringTable` 在 HotSpot 内部是一个**固定桶数的开放链表哈希表**：

```txt
StringTable (Native C++ Hashtable, JDK 7+ 位于 Java Heap)

Bucket[0]  →  StringNode("hello") → StringNode("world") → ...
Bucket[1]  →  StringNode("admin")
Bucket[2]  →  (empty)
...
Bucket[N]  →  StringNode("foobar") → ...  → ...
```

- **默认桶数**：JDK 7/8 为 60013，可通过 `-XX:StringTableSize` 调整（建议设为素数以减少哈希碰撞）。
- **碰撞处理**：链表法（Separate Chaining），同一桶内的元素以单向链表串联。
- **查找复杂度**：理论上 `O(1)`，但当单链表长度膨胀时退化为 `O(N)`。

`StringTable` 的桶数是固定的，不会像 `HashMap` 那样自动扩容。理解这个“固定容量”约束，是理解 §4.4 中 intern 滥用的关键。

### 3.4 `StringTable` 为什么要存在

从工程角度看，`StringTable` 解决的是一个跨类、跨 ClassLoader 的字符串去重问题：

- `com.example.OrderService` 里写了 `"SUCCESS"`，
- `com.example.PaymentService` 里也写了 `"SUCCESS"`，
- 如果每次都各自在堆里分配一个新的 `String` 对象，100 个类就多了 100 份冗余副本。

`StringTable` 让所有类共享同一份字面量对象。对于项目中广泛使用的枚举值、状态码、JSON Key，这能节省可观的内存。代价是每次 `ldc` 加载都多了一次哈希表查找——但这发生在类加载阶段，频率低，对运行期吞吐量的影响可忽略。

---

## 4. `intern()` —— 主动进入字符串池

### 4.1 `intern()` 到底做了什么

`String.intern()` 的 JavaDoc 描述很简洁：

> 当调用 intern 方法时，如果池中已经包含一个与此 String 对象相等的字符串（由 `equals(Object)` 方法确定），则返回池中的字符串。否则，将此 String 对象添加到池中，并返回此 String 对象的引用。

简单说：**调用 `intern()` 就是告诉 JVM——“如果池里已经有内容和我一样的字符串，就用池里的；如果没有，把我加进去”**。

与 `ldc` 的隐式 `intern()` 不同，`intern()` 可以由开发者**手动对任意 `String` 对象**调用，不受“是否为编译期字面量”的限制。这一点既是它的灵活之处，也是 §4.4 中问题的根源。

### 4.2 JDK 6 与 JDK 7 的行为变化

`StringTable` 的位置在 JDK 6 到 JDK 7 之间发生过一次关键迁移，这导致 `intern()` 的行为出现了实质性变化：

```txt
JDK 6 时代:
┌───────────────────────────────────────────────┐
│ 永久代 (PermGen - 非堆内存，大小固定)             │
│ ┌───────────────────────────────────────────┐ │
│ │ StringTable (Native C++ HashTable)        │ │
│ └───────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘
❌ 缺陷：对不可控的动态数据调用 intern()，
   字面量会占满固定大小的永久代，
   引发 java.lang.OutOfMemoryError: PermGen space

JDK 7 到现代 JDK 21+ 时代:
┌─────────────────────────────────────────────────┐
│ Java 堆内存 (Java Heap - 受 GC 管理与动态扩容)      │
│ ┌───────────────────────────────────────────┐   │
│ │ StringTable ──► 内部指针直接指向普通的堆对象   │   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
✅ StringTable 搬入主堆内存，可被主垃圾回收器（G1/ZGC）回收。
```

从 JDK 7 起，`StringTable` 整体搬迁到 Java 堆中。常量池中的字符串引用可以被主垃圾回收器管理，不再受 PermGen 固定大小的限制。但这只解决了 **OOM 问题**，并没有解决 **性能退化问题**——见 §4.4。

### 4.3 `intern()` 的使用边界

`intern()` 不是万能去重工具。它的适用场景有明确边界：

**✅ 适合 intern() 的场景**：

- 数量可控、高频重复的枚举类数据：国家代码、业务状态机、固定的 JSON Key（如 `"status"`、`"code"`、`"message"`）
- 从配置文件加载后长期驻留的字符串（如数据库连接 URL、MQ Topic 名）
- 已知总量在几百到几千量级的短字符串

**❌ 不适合 intern() 的场景**：

- 来自外部网络请求、MQ 消息、用户动态输入的流数据
- 不可控总量和内容分布的数据（如用户 ID、Trace ID、Session ID）
- 高吞吐量路径上的任何数据（频繁创建 + 频繁丢弃的 String）

衡量标准一句话：**如果字符串的数量和内容是你代码能控制的，可以考虑 intern()；如果来自外部、你无法预判数量和分布，不要 intern()**。

### 4.4 动态数据为什么不要滥用 `intern()`

下面这段代码是小规模测试时看起来没问题、上线后却能把系统拖垮的典型：

```java
// ⚠️ 危险做法：对完全不可控的动态数据调用 intern()
while ((line = reader.readLine()) != null) {
    String untrustedId = parseId(line).intern(); // 线上雪崩的导火索
    process(untrustedId);
}
```

上线初期内存确实下降。但当海量动态用户 ID 涌入后，系统吞吐量显著下降、CPU 飙升、GC 停顿时间（Pause Time）明显拉长。

**现场复盘——三条根因链**：

1. **哈希碰撞导致查找退化**：`StringTable` 默认只有 60013 个桶（见 §3.3）。当数百万不重复的动态 ID 被 `intern()` 加入后，每个桶链表平均长度从个位数膨胀到数十甚至上百。
2. **`O(1)` 退化为 `O(N)`**：链表越长，每次 `intern()` 调用（以及后续所有 `ldc` 加载）的查找消耗越大。CPU 时间从哈希取模 + 一次指针跳转，变成遍历一条长链表逐次 `equals()`。
3. **GC 连锁反应**：膨胀后的 `StringTable` 成为 GC 的扫描负担。即使使用 `-XX:+UseStringDeduplication`（G1/ZGC 的后台字节数组去重），也无法绕过 `StringTable` 本身的链表扰动——那个优化针对的是底层 `byte[]` 数组，不是哈希表结构。

**结论**：`StringTable` 搬回堆只是解决了 OOM，没有解决固定桶数下的性能退化。`String.intern()` 的正确角色是“少量高频重复字符串的内存压缩器”，不是“通用去重 Map”。当确实需要对海量动态字符串去重时，使用应用层方案——见 §7.2。

---

## 5. `Compact Strings` —— `String` 内存优化

前面 §2~§4 一直在讲“池”——StringTable 如何管理字面量引用。现在把视角转回 `String` **对象本身**：它的内部结构在两个 LTS 版本之间发生过一次彻底的重构。

### 5.1 `String` 对象的传统布局

在 JDK 8 及以前，`String` 的核心存储是 `char[]`：

```java
// JDK 8 及以前的 String 核心字段
public final class String
    implements java.io.Serializable, Comparable<String>, CharSequence {

    private final char value[];  // 每个字符 2 字节（UTF-16 编码单元）
    private int hash;            // 缓存的 hashCode
}
```

对于 64 位 HotSpot（开启压缩指针 CompressedOops），一个字面量 `"Java"`（4 个字符）的完整堆内存占用量是：

```txt
JDK 8 内存布局（64位 JVM 开启指针压缩）
存储内容：字面量 "Java" (4 个英文字符)

┌───────────────────────────┬───────────────────────────┐
│       Mark Word (8B)      │     Klass Pointer (4B)    │  ← 对象头 (12B)
├───────────────────────────┼───────────────────────────┤
│       hash int (4B)       │     char[] 引用指针 (4B)   │  ← 实例数据 (8B)
├───────────────────────────┴───────────────────────────┤
│  对齐填充 Padding (4B) [凑齐 8 字节整数倍]               │  ← (4B)
└───────────────────────────────────────────────────────┘  → String 壳对象 = 24 字节
     │
     └─► 指向独立的 char[] 数组（对象头 16B + 4字符×2B = 8B = 24B，恰好对齐）
         【总计：24B 壳 + 24B 数组 = 48 字节】
```

### 5.2 为什么 ASCII 浪费了一半空间

每个 `char` 是 16 位的 UTF-16 代码单元。对于纯 ASCII / Latin-1 字符（英文字母、数字、基本标点），高 8 位恒为 0：

```txt
字符 'J' (U+004A)
  UTF-16 编码: 0x004A
  高字节: 0x00 ← 不携带任何信息
  低字节: 0x4A ← 实际数据

字符 'a' (U+0061)
  UTF-16 编码: 0x0061
  高字节: 0x00 ← 又是零
  低字节: 0x61
```

在典型的企业应用中，JSON 键名、URL 路径、HTTP Header、状态码、SQL 片段大部分由 Latin-1 字符组成。这些字符串的 `char[]` 有将近一半的字节是零填充。对于堆中存活数百万个 `String` 的系统，这意味着 **数十 MB 甚至上百 MB 的内存空间被零字节占用**。

### 5.3 `Compact Strings` 原理

JDK 9（JEP 254）对这个问题的解法是：**把底层存储从 `char[]` 改为 `byte[]`，再用一个标志位区分编码**。

```java
// JDK 9+ 的 String 核心字段
public final class String
    implements java.io.Serializable, Comparable<String>, CharSequence {

    @Stable
    private final byte[] value;  // 改为字节数组，按需分配宽度

    private final byte coder;    // 编码标志：LATIN1=0, UTF16=1

    private int hash;            // 缓存不变
    @Native static final byte LATIN1 = 0;
    @Native static final byte UTF16  = 1;
}
```

核心逻辑：创建 `String` 时，`javac` 或运行时构造器检测字符内容：

- 全部为 Latin-1 字符 → `coder = 0`，`byte[]` 长度 = 字符数，每字符占 1 字节；
- 包含非 Latin-1 字符 → `coder = 1`，`byte[]` 长度 = 字符数 × 2，回退到 UTF-16。

```txt
JDK 9+ 内存布局（Compact Strings）
存储内容：字面量 "Java" (4 个英文字符，coder=0)

┌───────────────────────────┬───────────────────────────┐
│       Mark Word (8B)      │     Klass Pointer (4B)    │  ← 对象头 (12B)
├───────────────────────────┼───────────────────────────┤
│       hash int (4B)       │     byte[] 引用指针 (4B)   │  ← 实例数据 (8B)
├───────────────────────────┬───────────────────────────┤
│       coder byte (1B)     │  对齐填充 Padding (3B)      │  ← 实例数据 + 填充 (4B)
└───────────────────────────┴───────────────────────────┘  → String 壳对象 = 24 字节
     │
     └─► 指向紧凑的 byte[] 数组（对象头 16B + 4字符×1B = 4B + 4B 填充 = 24B）
         【当前短字符串与 JDK8 持平，但长字符串下差距显著】
```

对于 4 字符的极短字符串，由于 JVM 8 字节对齐的硬性规定，两者总量相同。但字符串越长，Compact Strings 省下的空间越明显：一个 64 字符的 ASCII 字符串，JDK 8 的 `char[]` 需要 128 字节数据区，JDK 9+ 只需 64 字节。

### 5.4 `coder` 字段与 LATIN1 / UTF16

`coder` 是 `byte` 类型，取值为 `LATIN1 = 0` 或 `UTF16 = 1`。`String` 的所有公开方法（`charAt`、`length`、`substring`、`indexOf` 等）在内部都以 `coder` 为分支条件：

```java
// JDK 9+ String.charAt() 简化逻辑
public char charAt(int index) {
    if (coder == LATIN1) {
        return (char)(value[index] & 0xff);       // 1 字节 → 扩展为 char
    } else {
        return (char)(((value[index << 1] & 0xff) << 8)
                    | (value[(index << 1) + 1] & 0xff));  // 2 字节 → 合并为 char
    }
}
```

由于 `coder` 在构造后不再改变（`@Stable` 注解提示 JIT 可将其视为常量折叠），分支预测器对这个单条件跳转的命中率极高，运行时开销几乎为零。

### 5.5 哪些场景收益最大

Compact Strings 的实际收益取决于系统中 Latin-1 字符串的比例。以下场景受益最明显：

| 场景 | 典型字符串 | Latin-1 比例 | 预计内存节省 |
| :-- | :-- | :-- | :-- |
| JSON/XML 键名 | `"userId"`, `"status"`, `"timestamp"` | ~100% | ~40-45% |
| HTTP Header | `"Content-Type"`, `"Authorization"` | ~100% | ~40-45% |
| URL 路径 | `"/api/v1/users/123/orders"` | ~95% | ~35-40% |
| 配置项 Key | `"spring.datasource.url"` | ~100% | ~40-45% |
| 英文日志内容 | `"Request processed successfully"` | ~100% | ~45% |
| 混合中英文 | `"用户[admin] 登录失败"` | ~60% | ~15-20% |
| 纯中文 | `"用户权限不足"` | 0% | ~0%（仍需 UTF-16） |

在一个以英文 JSON API 为主的微服务集群中，Compact Strings 通常能减少 30-40% 的字符串总内存。不依赖任何代码修改，升级 JDK 9+ 即可自动生效。

---

## 6. `String` 拼接机制演进

前面讲的是“String 本身怎么存”。现在讲“String 怎么产生新的对象”——也就是拼接。

### 6.1 为什么 `String` 不可变导致频繁创建对象

因为不可变（§1.2），任何对 `String` 的“修改”操作——拼接、截取、替换——都不能在原对象上改动，只能创建一个新对象：

```java
String s = "hello";
s = s + " world";  // 不是修改原字符串，而是创建新字符串 "hello world"
```

一次拼接就是一个新对象。在单条语句中，编译器可以优化掉中间对象（见 §6.2~§6.3）；但在循环中，每条迭代都会产生新对象，且上一轮产生的临时对象立即变成垃圾——这才是真正的性能隐患。

### 6.2 JDK 8：`StringBuilder` 拼接

在 JDK 8 及以前，编译器将 `+` 拼接翻译为 `StringBuilder` 链式调用：

```java
String s = a + b + c;
```

```volt
// JDK 8 反编译字节码片段
0: new           #2                  // class java/lang/StringBuilder
3: dup
4: invokespecial #3                  // Method StringBuilder."<init>":()V
7: aload_1                           // 加载变量 a
8: invokevirtual #4                  // Method StringBuilder.append:(String)StringBuilder;
11: aload_2                          // 加载变量 b
12: invokevirtual #4                 // Method StringBuilder.append
15: aload_3                          // 加载变量 c
16: invokevirtual #4                 // Method StringBuilder.append
19: invokevirtual #5                 // Method StringBuilder.toString:()String;
```

`StringBuilder` 内部维护一个可扩容的 `char[]`（JDK 9+ 改为 `byte[]`），默认初始容量 16。超过容量时会触发扩容（数组复制 + 重新分配）。对于已知长度的拼接，预估初始容量可以消除扩容开销——见 §7.3。

### 6.3 JDK 9+：`invokedynamic` + `StringConcatFactory`

从 JDK 9 开始，同样的 `a + b + c` 在字节码里不再出现 `StringBuilder`，而是：

```volt
// 现代 JDK (9/17/21) 反编译字节码片段 (a + b + c)
0: aload_1                           // 加载变量 a
1: aload_2                           // 加载变量 b
2: aload_3                           // 加载变量 c
3: invokedynamic #4,  0              // 动态生成拼接调用点
    // BootstrapMethod: java/lang/invoke/StringConcatFactory.makeConcatWithConstants
```

编译器不再硬编码使用 `StringBuilder`，而是用 `invokedynamic` 指令在**运行时**交给虚拟机的引导方法（Bootstrap Method）——`StringConcatFactory.makeConcatWithConstants`。JVM 在第一次执行到这里时，根据当前硬件和上下文动态生成拼接策略：可能直接通过 `MethodHandle` + `Unsafe` 向内存块写字节，绕开 `StringBuilder` 的对象创建与扩容开销。

> 📖 `invokedynamic` 三件套（`CallSite` / `BootstrapMethod` / `StringConcatFactory.makeConcatWithConstants`）家族详见 [[Java8] 函数式编程](@java-字节码-函数式编程) §2.1，本文不再重复展开。

**动态绑定的实际价值**：将“语法拼写”与“底层实现”解耦。旧代码不需重新编译，升级 JDK 就能享受新的拼接实现。但这也意味着你不能通过看字节码来预判拼接的性能——它取决于运行时生成的策略。

### 6.4 编译器还能做哪些优化

除了 `invokedynamic`，编译器还做了以下优化：

1. **常量折叠（§2.1 已述）**：纯字面量的拼接在编译期完成，不留任何字节码。`"he" + "llo"` 直接变成 `"hello"`。
2. **单语句多变量优化**：`a + b + c + d + e` 在 `invokedynamic` 路径下会被打包成一个调用点，一次性将 5 个变量压栈，由 `StringConcatFactory` 生成最优策略——不再需要 `StringBuilder` 的多次 `append`。
3. **空字符串消除**：如果拼接链中有常量空字符串 `""`，编译器直接跳过。

这些优化的边界也很清晰：**一旦拼接跨越多条语句（如循环体内部），编译器无法将多次拼接合并为一个调用点**。这正是 §6.5 和 §7.1 的切入点。

### 6.5 循环拼接为什么仍然危险

无论 JDK 8 的 `StringBuilder` 还是 JDK 9+ 的 `invokedynamic`，都只能在**单条可一次性确定上下文**的语句中生效。循环体内的 `+=` 不在这个范围：

```java
// ❌ 循环体内的 +=：每一轮都创建新对象
String report = "";
for (int i = 0; i < 10000; i++) {
    report += "data_" + i;  // 每轮：创建新 String + 丢弃旧 String
}
```

在单线程低并发时只是慢几毫秒，但在高并发线程池中，每轮循环产生的新 String 对象快速用尽线程本地分配缓冲区（TLAB），触发 JVM 回退到共享 Eden 的慢路径分配，伴随更频繁的 Young GC。

> 📌 **TLAB 澄清**：TLAB 是每个线程私有的一段连续 Eden 区内存（通过 bump pointer 分配），不是队列，也不涉及全局锁。用尽时线程以 CAS 方式从共享 Eden 申请新 TLAB——这是慢路径，不是锁竞争。真正的锁竞争主要发生在 Eden 不足以切出新 TLAB、被迫触发 Young GC 时。

循环拼接的正确做法见 §7.1。

---

## 7. 工程实践：高并发文本处理红线

### 7.1 🚨 严禁循环体内高频 `+=`

**❌ 反模式**：

```java
// 即使在 JDK 17 下，循环内的 += 仍是性能陷阱
String csv = "";
for (User user : largeUserList) {
    csv += user.getId() + ",";  // 每轮创建临时 String + 上一轮的变成垃圾
}
```

**✅ 标准范式**：

```java
// 显式 StringBuilder + 预估容量
int estimatedSize = largeUserList.size() * 12;  // 每行约 12 字符
StringBuilder sb = new StringBuilder(estimatedSize);
for (User user : largeUserList) {
    sb.append(user.getId()).append(',');
}
String csv = sb.toString();
```

依据：`invokedynamic` 的拼接优化作用域仅限于单条语句，循环体每轮迭代都是一次独立的 `invokedynamic` 调用——无法复用上一轮的结果，中间对象照常产生。

### 7.2 🚨 谨慎使用 `intern()`

> 本节是对 §4.3 和 §4.4 的工程落地。

**❌ 反模式**：

```java
// 对不可控的动态数据调用 intern()：CPU 飙升 + GC 频繁的导火索
while ((line = reader.readLine()) != null) {
    String untrustedId = parseId(line).intern(); // 线上雪崩
    process(untrustedId);
}
```

**✅ 标准范式（层内去重方案）**：

当需要对海量动态字符串去重时，在应用层使用可控容器，而不是向 Native `StringTable` 追加：

```java
// Guava 的 WeakInterner：底层是弱引用 ConcurrentHashMap，
// Key 不再被强引用后可由 GC 回收，与 StringTable 的强引用语义完全隔离
import com.google.common.collect.Interner;
import com.google.common.collect.Interners;

private static final Interner<String> ID_POOL = Interners.newWeakInterner();

while ((line = reader.readLine()) != null) {
    String canonicalId = ID_POOL.intern(parseId(line)); // 应用层去重
    process(canonicalId);
}
```

若不引入第三方库，用 `ConcurrentHashMap` + 容量上限 + LRU 淘汰自建等价容器即可。核心原则：**去重表在堆内可见、可测、可清空、可淘汰**，而 `String.intern()` 三样都做不到。

**JVM 侧辅助**：如果系统确实存在海量重复字符串的底层 `byte[]` 数组（非 String 壳），且使用 G1 或 ZGC，可开启 `-XX:+UseStringDeduplication`——GC 在后台并发标记时自动发现内容相同的 `byte[]` 并合并，不经过 `StringTable`，不产生链表扰动。

### 7.3 🚨 `StringBuilder` 容量预估

`StringBuilder` 默认初始容量为 16 字符，超过容量时触发扩容——内部数组复制 + 新数组分配。预估容量能消除这部分开销。

**❌ 反模式**：

```java
StringBuilder sb = new StringBuilder();  // 默认 16，大概率扩容多次
for (int i = 0; i < 10000; i++) {
    sb.append("data_").append(i).append(',');
}
```

**✅ 标准范式**：

```java
// 预估逻辑：每行约 "data_" (5) + 数字 (1~5) + "," (1) ≈ 10 字符
StringBuilder sb = new StringBuilder(10000 * 10);
for (int i = 0; i < 10000; i++) {
    sb.append("data_").append(i).append(',');
}
```

容量预估不需要精确——给一个接近的数量级就能消除大部分扩容。低估值的影响远小于不估值。

### 7.4 🚨 敏感数据为什么不要长期保留 `String`

把 `String` 设计为不可变带来了安全上的两面性。

**第一面：不可变性作为完整性保障**

当数据库连接 URI、文件路径、鉴权 Token 以 `String` 形式在系统中传递时，不可变性保证这些值不会被意外修改：

```java
String dbUrl = "jdbc:mysql://prod-server:3306/users?token=SECRET";
// 无论这个引用被传递到多少线程、多少层方法调用，
// 其内部字符序列始终不变——这是 JVM 类型系统层面的保证。
```

**第二面：不可变性作为内存擦除的障碍**

恰恰因为 `String` 无法被修改，用它存储密码时会引发一个问题：用完之后，你没办法主动清除它在内存中的痕迹。

```java
// ❌ 问题做法：用 String 存储密码
String password = request.getParameter("password");
authenticate(password);
// password 的底层 byte[] 完整保留在堆内存中，直到 GC 在不确定的时间点回收。
// 在这个窗口期内，heap dump / 核心转储 / 内存映射漏洞都可获取明文密码。
```

```java
// ✅ 标准做法：用 char[] 存储，使用后立即擦除
char[] passwordBuffer = request.getParameter("password").toCharArray();
authenticate(passwordBuffer);
Arrays.fill(passwordBuffer, '\0'); // 立即将缓冲区清零
```

`Arrays.fill` 会把数组对应的内存区域覆写为零值。即使此后发生 heap dump，这段内存中残留的也不再是密码原文。

工程纪律：在安全敏感的密钥管理模块中，使用 `char[]` 替代 `String` 来存储密码和密钥，是一个有充分技术依据的行业惯例。Java 核心 API 的设计本身就体现了这一点——`javax.security.auth.callback.PasswordCallback#getPassword()` 返回的正是 `char[]` 而非 `String`，`javax.crypto.spec.PBEKeySpec` 的构造器也只接受 `char[]` 作为密码入参。JDK 官方 API 用签名本身把这条约束写进了类型系统。但这条规范对执行场景有明确的边界要求——它对密码学组件是必要的工程纪律，对普通业务模块则是推荐实践而非强制红线。团队应根据自身的威胁模型决定其优先级。

### 7.5 文本处理性能优化 Checklist

| 检查项 | 说明 | 优先级 |
| :-- | :-- | :-- |
| 循环内无 `+=` | 替换为 `StringBuilder` | 🔴 强制 |
| `StringBuilder` 有容量预估 | `new StringBuilder(n)` 参数为非默认值 | 🟡 建议 |
| 无对外部动态数据调用 `intern()` | 若需去重，用 `Interners.newWeakInterner()` | 🔴 强制 |
| 密码/密钥使用 `char[]` 而非 `String` | 涉及 `javax.crypto` / `javax.security` 时必须 | 🔴 强制 |
| 升级到 JDK 9+ | 获取 Compact Strings + `invokedynamic` 拼接 | 🟢 推荐 |
| 高频去重场景开启 `UseStringDeduplication` | G1/ZGC 下有效，不影响 `StringTable` | 🟡 条件开启 |
| 预计算 `StringBuilder` 容量使用实际数据验证 | 避免过度分配或频繁扩容 | 🟡 建议 |

---

## 8. 🗺️ 跨篇章知识关联

- [Java NIO 与 IO 模型](@java-OS-NIO与IO模型) 展开本篇的字节数组跨出 Java 堆的场景：零拷贝（Zero-Copy）与堆外直接内存（`DirectByteBuffer`）。
- [Java8 函数式编程](@java-字节码-函数式编程) §2.1 展开本篇 §6.3 中作为拼接入口出现的 `invokedynamic` 指令，提供完整的 `CallSite` / `BootstrapMethod` / `LambdaMetafactory` 家族拆解。
