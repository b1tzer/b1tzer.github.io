---
doc_id: java-Java8其他新特性
title: "[Java8] 其他新特性"
---

# [Java8] 其他新特性

> 本文涵盖 Java 8 的两个重要新特性：**新日期 API**（java.time）和**接口默认方法与静态方法**。

---

## 一、新日期 API

---

### 1. 引入：为什么要替换 Date/Calendar？

| 问题 | 旧 API（Date/Calendar） | 新 API（java.time） | 为什么新 API 更好 |
| ：--- | ：--- | ：--- | ：--- |
| 线程安全 | ❌ 非线程安全 | ✅ 不可变对象，天然线程安全 | 不可变对象无需同步，可安全共享 |
| 月份从0开始 | ❌ 0=1月，极易出错 | ✅ 1=1月，符合直觉 | 历史遗留问题，新 API 修正了 |
| 时区处理 | ❌ 混乱，容易出错 | ✅ ZonedDateTime 明确处理时区 | 时区和时间分离，语义清晰 |
| API 设计 | ❌ 方法命名混乱 | ✅ 清晰的 of/from/with/plus/minus | 流式 API，链式调用 |

> **为什么旧 `Date` 非线程安全**：`SimpleDateFormat` 内部有可变状态（`Calendar` 字段），多线程同时调用 `format()` 会互相覆盖状态，导致结果错误。新 API 的 `DateTimeFormatter` 是不可变的，天然线程安全。

---

### 2. 三个核心类对比

| 类 | 包含信息 | 适用场景 |
| ：--- | ：--- | ：--- |
| `LocalDate` | 仅日期（年月日） | 生日、节假日、不涉及时间的日期 |
| `LocalDateTime` | 日期+时间，无时区 | 单时区系统的业务时间 |
| `ZonedDateTime` | 日期+时间+时区 | 跨时区系统、国际化应用 |

---

### 3. 核心类使用

```java
// LocalDate：只有日期，无时间，无时区
LocalDate today = LocalDate.now();
LocalDate birthday = LocalDate.of(1990, 6, 15);
LocalDate nextWeek = today.plusWeeks(1);
long daysBetween = ChronoUnit.DAYS.between(birthday, today);

// LocalDateTime：日期+时间，无时区
LocalDateTime now = LocalDateTime.now();
LocalDateTime meeting = LocalDateTime.of(2024, 3, 15, 14, 30, 0);
String formatted = now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

// ZonedDateTime：带时区的日期时间（跨时区系统必用）
ZonedDateTime shanghaiTime = ZonedDateTime.now(ZoneId.of("Asia/Shanghai"));
ZonedDateTime newYorkTime = shanghaiTime.withZoneSameInstant(ZoneId.of("America/New_York"));

// Instant：时间戳（与旧 Date 互转）
Instant instant = Instant.now();
Date oldDate = Date.from(instant);          // 新转旧
Instant fromOld = oldDate.toInstant();      // 旧转新
```

---

### 4. 新日期 API 常见问题

**Q：LocalDate、LocalDateTime、ZonedDateTime 有什么区别？**

> `LocalDate` 只有日期，适合生日、节假日等场景；`LocalDateTime` 有日期和时间但无时区，适合单时区系统；`ZonedDateTime` 包含时区信息，适合跨时区的国际化应用。

**Q：为什么新日期 API 是线程安全的？**

> 新日期 API 的所有类都是不可变对象，每次操作（如 `plusDays`）都返回新对象，不修改原对象，因此天然线程安全，无需同步。

**Q：如何将旧的 Date 转换为新的 LocalDateTime？**

> ```java
> Date date = new Date();
> LocalDateTime ldt = date.toInstant()
>     .atZone(ZoneId.systemDefault())
>     .toLocalDateTime();
> ```

---

### 5. 新日期 API 工作中常见坑

#### ❌ 坑1：SimpleDateFormat 多线程共享导致数据错乱

```java
// ❌ 危险：SimpleDateFormat 是非线程安全的，多线程共享会出错
public class DateUtils {
    // 静态共享，多线程并发调用 format/parse 会互相覆盖内部状态
    private static final SimpleDateFormat SDF = new SimpleDateFormat("yyyy-MM-dd");

    public static String format(Date date) {
        return SDF.format(date); // 多线程下结果不可预期！
    }
}

// ✅ 方案1：使用新 API 的 DateTimeFormatter（不可变，线程安全）
private static final DateTimeFormatter FORMATTER =
    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

public static String format(LocalDateTime dateTime) {
    return dateTime.format(FORMATTER); // 线程安全
}

// ✅ 方案2：如果必须用旧 API，用 ThreadLocal 隔离
private static final ThreadLocal<SimpleDateFormat> SDF_THREAD_LOCAL =
    ThreadLocal.withInitial(() -> new SimpleDateFormat("yyyy-MM-dd"));

public static String format(Date date) {
    return SDF_THREAD_LOCAL.get().format(date); // 每个线程独立实例
}
```

#### ❌ 坑2：月份从 0 开始的历史遗留坑

```java
// ❌ 旧 API：月份从 0 开始，极易出错
Calendar cal = Calendar.getInstance();
cal.set(2024, 1, 15); // 这是 2024年2月15日，不是1月！（1月是0）

// ✅ 新 API：月份从 1 开始，符合直觉
LocalDate date = LocalDate.of(2024, 1, 15); // 这才是 2024年1月15日
LocalDate date2 = LocalDate.of(2024, Month.JANUARY, 15); // 更清晰
```

#### ❌ 坑3：时区处理不当导致时间偏差

```java
// ❌ 危险：服务器时区和数据库时区不一致时，存储/读取时间会偏差
LocalDateTime now = LocalDateTime.now(); // 依赖 JVM 默认时区，不同服务器可能不同

// ❌ 危险：数据库存储 LocalDateTime，跨时区部署时数据混乱
// 北京服务器存入 2024-01-15 14:00:00（北京时间）
// 美国服务器读出 2024-01-15 14:00:00（美国时间）→ 相差13小时！

// ✅ 方案：统一使用 UTC 时间戳存储，展示时再转换为用户时区
Instant now = Instant.now(); // UTC 时间戳，与时区无关
// 存入数据库：now.toEpochMilli()（毫秒时间戳）

// 展示时转换为用户时区
ZonedDateTime userTime = now.atZone(ZoneId.of("Asia/Shanghai"));
String display = userTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
```

#### ❌ 坑4：日期计算忽略夏令时

```java
// ❌ 危险：某些国家有夏令时，直接加减小时数可能不准确
ZonedDateTime dt = ZonedDateTime.of(2024, 3, 10, 1, 30, 0, 0,
    ZoneId.of("America/New_York")); // 美国夏令时切换日
ZonedDateTime next = dt.plusHours(1); // 夏令时切换，实际跳过了一小时

// ✅ 新 API 会自动处理夏令时，但要用 ZonedDateTime 而非 LocalDateTime
// LocalDateTime 不感知时区，无法处理夏令时
```

#### ❌ 坑5：数据库与 Java 时间类型的映射

```java
// MySQL DATETIME ↔ Java 类型映射（MyBatis/JPA）
// DATETIME    → LocalDateTime  ✅
// DATE        → LocalDate      ✅
// TIMESTAMP   → Instant / ZonedDateTime  ✅（TIMESTAMP 存储 UTC）
// BIGINT      → Instant.toEpochMilli()   ✅（推荐，时区无关）

// ❌ 常见错误：用 String 存储时间
// "2024-01-15 14:00:00" 存为 VARCHAR，无法利用数据库的时间函数和索引

// ✅ MyBatis 配置（application.yml）
// mybatis-plus.configuration.default-enum-type-handler: ...
// Spring Boot 2.x 默认支持 LocalDateTime，无需额外配置
```

---

## 二、接口默认方法与静态方法

---

### 1. 引入：为什么需要默认方法？

**问题**：接口一旦发布，新增方法会破坏所有实现类（编译错误）。

```java
// Java 8 之前：给接口加方法 = 所有实现类都要改
// Java 8 之后：用 default 方法提供默认实现，向后兼容

public interface Collection<E> {
    // 新增 forEach，但不破坏已有实现类
    // 为什么这样设计：Java 8 要给所有集合类加 forEach，
    // 如果不用 default，所有 Collection 实现类都要改，影响面太大
    default void forEach(Consumer<? super E> action) {
        for (E e : this) {
            action.accept(e);
        }
    }
}
```

---

### 2. 默认方法 vs 静态方法

| 特性 | 默认方法（default） | 静态方法（static） |
| ：--- | ：--- | ：--- |
| 调用方式 | 通过实例调用，可被子类覆盖 | 通过接口名调用，不可被覆盖 |
| 用途 | 为接口提供默认实现，保持向后兼容 | 提供工具方法，与接口强相关的静态工具 |
| 示例 | `Collection.forEach()` | `Comparator.comparing()` |

```java
public interface Validator<T> {
    // 默认方法：提供默认实现，子类可覆盖
    default boolean validate(T value) {
        return value != null;
    }

    // 静态方法：工具方法，通过接口名调用
    static <T> Validator<T> notNull() {
        return value -> value != null;
    }
}

// 使用静态方法
Validator<String> v = Validator.notNull();
```

---

### 3. 多继承冲突解决规则

```java
interface A {
    default void hello() { System.out.println("A"); }
}
interface B extends A {
    default void hello() { System.out.println("B"); }
}
class C implements A, B {
    // 规则1：类中的方法优先于接口默认方法
    // 规则2：子接口优先于父接口（B 优先于 A）
    // 规则3：若仍有歧义，必须显式覆盖
    @Override
    public void hello() {
        B.super.hello(); // 显式指定调用 B 的默认方法
    }
}
```

**三条优先级规则**：

1. **类优先**：类中定义的方法优先于接口默认方法
2. **子接口优先**：更具体的接口（子接口）优先于父接口
3. **显式覆盖**：若仍有歧义，必须在实现类中显式覆盖并指定调用哪个接口的方法

---

### 4. 接口方法常见问题

**Q：接口默认方法和抽象类有什么区别？**

> 1. 接口可以多实现，抽象类只能单继承；2. 接口默认方法不能有状态（字段），抽象类可以有实例字段；3. 接口默认方法主要用于向后兼容，抽象类用于代码复用和模板方法模式。

**Q：Java 8 接口可以有哪些类型的方法？**

> Java 8 接口可以有：1. 抽象方法（必须实现）；2. 默认方法（`default`，有实现，可覆盖）；3. 静态方法（`static`，有实现，不可覆盖）。Java 9 还增加了私有方法（`private`）。

**Q：为什么 Java 8 要给接口加默认方法？**

> 主要是为了向后兼容。Java 8 引入 Stream API 后，需要给 `Collection` 接口添加 `stream()`、`forEach()` 等方法。如果没有默认方法，所有实现了 `Collection` 的类都需要修改，影响面极大。

---

### 5. 接口方法工作中常见坑

#### ❌ 坑1：把 default 方法当抽象类用（滥用）

```java
// ❌ 错误：用 default 方法存储状态，接口不应该有状态
public interface UserService {
    // 接口没有实例字段，这里的 cache 是静态的！
    // 所有实现类共享同一个 cache，可能导致数据混乱
    default Map<Long, User> getCache() {
        return new HashMap<>(); // 每次调用都返回新 Map，毫无意义
    }
}

// ✅ 正确：default 方法只用于提供默认行为，不存储状态
// 需要状态时，用抽象类
public abstract class AbstractUserService {
    private final Map<Long, User> cache = new ConcurrentHashMap<>(); // 有状态，用抽象类

    protected Map<Long, User> getCache() { return cache; }
}
```

#### ❌ 坑2：default 方法与实现类方法的优先级混淆

```java
public interface Greeting {
    default String greet() { return "Hello from Interface"; }
}

public class MyService implements Greeting {
    // 类中的方法优先于接口 default 方法
    // 如果这里不写 greet()，调用的是接口的 default 方法
    // 如果这里写了 greet()，调用的是这里的方法（覆盖了 default）
}

// ⚠️ 工作中的坑：升级第三方库时，库的接口新增了 default 方法
// 如果你的实现类恰好有同名方法，行为可能发生变化！
// 例如：你的类有 default void close() {}，库接口新增了 default void close() {}
// 你的类方法会覆盖库的 default 方法，可能导致资源未正确关闭
```

#### ❌ 坑3：接口静态方法不能被继承

```java
public interface Validator {
    static Validator notNull() { return value -> value != null; }
}

public interface StringValidator extends Validator {
    // 接口静态方法不能被继承！
    // StringValidator.notNull() 编译报错
}

// ✅ 只能通过定义它的接口名调用
Validator v = Validator.notNull(); // ✅
// StringValidator.notNull(); // ❌ 编译报错
```

#### ❌ 坑4：Java 9 私有方法的使用场景

```java
// Java 9 新增：接口私有方法，用于提取 default 方法的公共逻辑
public interface DataProcessor {
    default void processText(String text) {
        validate(text);  // 调用私有方法
        // 处理文本...
    }

    default void processJson(String json) {
        validate(json);  // 复用同一个私有方法
        // 处理 JSON...
    }

    // 私有方法：只能在接口内部调用，不暴露给实现类
    private void validate(String input) {
        if (input == null || input.isEmpty()) {
            throw new IllegalArgumentException("输入不能为空");
        }
    }
}
// ⚠️ 注意：私有方法是 Java 9 特性，Java 8 不支持
```
