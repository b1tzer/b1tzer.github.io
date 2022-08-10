# 新日期 API

---

## 1. 引入：为什么要替换 Date/Calendar？

| 问题 | 旧 API（Date/Calendar） | 新 API（java.time） | 为什么新 API 更好 |
|------|------------------------|-------------------|----------------|
| 线程安全 | ❌ 非线程安全 | ✅ 不可变对象，天然线程安全 | 不可变对象无需同步，可安全共享 |
| 月份从0开始 | ❌ 0=1月，极易出错 | ✅ 1=1月，符合直觉 | 历史遗留问题，新 API 修正了 |
| 时区处理 | ❌ 混乱，容易出错 | ✅ ZonedDateTime 明确处理时区 | 时区和时间分离，语义清晰 |
| API 设计 | ❌ 方法命名混乱 | ✅ 清晰的 of/from/with/plus/minus | 流式 API，链式调用 |

> **为什么旧 `Date` 非线程安全**：`SimpleDateFormat` 内部有可变状态（`Calendar` 字段），多线程同时调用 `format()` 会互相覆盖状态，导致结果错误。新 API 的 `DateTimeFormatter` 是不可变的，天然线程安全。

---

## 2. 三个核心类对比

| 类 | 包含信息 | 适用场景 |
|----|---------|---------|
| `LocalDate` | 仅日期（年月日） | 生日、节假日、不涉及时间的日期 |
| `LocalDateTime` | 日期+时间，无时区 | 单时区系统的业务时间 |
| `ZonedDateTime` | 日期+时间+时区 | 跨时区系统、国际化应用 |

---

## 3. 核心类使用

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

## 4. 面试高频问题

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

## 5. 工作中常见坑

### ❌ 坑1：SimpleDateFormat 多线程共享导致数据错乱

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

### ❌ 坑2：月份从 0 开始的历史遗留坑

```java
// ❌ 旧 API：月份从 0 开始，极易出错
Calendar cal = Calendar.getInstance();
cal.set(2024, 1, 15); // 这是 2024年2月15日，不是1月！（1月是0）

// ✅ 新 API：月份从 1 开始，符合直觉
LocalDate date = LocalDate.of(2024, 1, 15); // 这才是 2024年1月15日
LocalDate date2 = LocalDate.of(2024, Month.JANUARY, 15); // 更清晰
```

### ❌ 坑3：时区处理不当导致时间偏差

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

### ❌ 坑4：日期计算忽略夏令时

```java
// ❌ 危险：某些国家有夏令时，直接加减小时数可能不准确
ZonedDateTime dt = ZonedDateTime.of(2024, 3, 10, 1, 30, 0, 0,
    ZoneId.of("America/New_York")); // 美国夏令时切换日
ZonedDateTime next = dt.plusHours(1); // 夏令时切换，实际跳过了一小时

// ✅ 新 API 会自动处理夏令时，但要用 ZonedDateTime 而非 LocalDateTime
// LocalDateTime 不感知时区，无法处理夏令时
```

### ❌ 坑5：数据库与 Java 时间类型的映射

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