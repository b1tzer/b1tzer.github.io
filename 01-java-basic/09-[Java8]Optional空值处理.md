<!-- nav-start -->

---

[⬅️ 上一篇：Stream API](08-[Java8]Stream流式编程.md) | [🏠 返回目录](../README.md) | [下一篇：新日期 API ➡️](10-[Java8]新日期API.md)

<!-- nav-end -->

# Optional

---

## 1. 引入：它解决了什么问题？

Optional 将"可能为空"这个语义显式化，强制调用方处理空值情况，减少 NullPointerException。

```java
// 传统写法：层层判空，代码丑陋，容易遗漏
String city = null;
if (user != null) {
    Address address = user.getAddress();
    if (address != null) {
        city = address.getCity();
    }
}

// Optional 写法：链式调用，语义清晰，强制处理空值
String city = Optional.ofNullable(user)
    .map(User::getAddress)
    .map(Address::getCity)
    .orElse("未知城市");
```

> **为什么 Optional 能减少 NPE**：Optional 将"可能为空"这个语义显式化，调用方必须处理空值情况（通过 `orElse`/`ifPresent` 等），而不是忘记判空。

---

## 2. Optional 核心 API

```java
// 创建
Optional<String> opt1 = Optional.of("value");        // 值不能为null，否则NPE
Optional<String> opt2 = Optional.ofNullable(null);   // 值可以为null
Optional<String> opt3 = Optional.empty();             // 空Optional

// 判断与获取
opt1.isPresent();           // true
opt1.get();                 // "value"（为空时抛NoSuchElementException）
opt2.orElse("default");     // null时返回"default"
opt2.orElseGet(() -> computeDefault()); // 懒加载默认值（比orElse更高效，只在为空时才计算）
opt2.orElseThrow(() -> new RuntimeException("值不存在"));

// 转换
opt1.map(String::toUpperCase);           // Optional["VALUE"]
opt1.filter(s -> s.length() > 3);       // Optional["value"]
opt1.flatMap(s -> Optional.of(s + "!")); // Optional["value!"]
```

> **为什么 `orElseGet` 比 `orElse` 更高效**：`orElse("default")` 无论是否为空都会计算默认值；`orElseGet(() -> computeDefault())` 只在为空时才执行 Lambda，如果默认值计算开销大（如查数据库），应优先用 `orElseGet`。

---

## 3. Optional 使用原则（误区分析）

```java
// ✅ 正确：用于方法返回值，表达"可能没有结果"
public Optional<User> findUserById(Long id) {
    return Optional.ofNullable(userRepository.findById(id));
}

// ❌ 错误：不应用于方法参数（调用方传null更混乱）
// 原因：调用方可能传 Optional.empty()，也可能传 null，反而增加处理复杂度
public void process(Optional<String> name) { ... }

// ❌ 错误：不应用于字段（序列化问题）
// 原因：Optional 没有实现 Serializable，序列化时会报错
public class User {
    private Optional<String> nickname; // 错误！
}

// ❌ 错误：不要用isPresent() + get()，等同于判null，没有意义
if (opt.isPresent()) {
    String val = opt.get(); // 这和 if(val != null) 没区别，失去了 Optional 的意义
}
// ✅ 应该用 ifPresent() 或 map()
opt.ifPresent(val -> System.out.println(val));
```

---

## 4. 面试高频问题

**Q：Optional 为什么不能用于方法参数？**
> 如果方法参数是 `Optional<T>`，调用方可能传入 `Optional.empty()`，也可能传入 `null`（忘记包装），反而增加了处理复杂度。方法参数应该直接用 `@Nullable` 注解或重载方法来表达可选性。

**Q：为什么 `orElseGet` 比 `orElse` 更高效？**
> `orElse(value)` 无论是否为空都会计算 value；`orElseGet(() -> compute())` 只在为空时才执行 Lambda。如果默认值计算开销大（如查数据库），应优先用 `orElseGet`。

**Q：Optional.of() 和 Optional.ofNullable() 有什么区别？**
> `Optional.of(value)` 要求 value 不能为 null，否则立即抛 NullPointerException；`Optional.ofNullable(value)` 允许 value 为 null，为 null 时返回 `Optional.empty()`。

---

## 5. 工作中常见坑

### ❌ 坑1：Optional 嵌套（Optional 套 Optional）

```java
// ❌ 错误：返回 Optional<Optional<User>>，调用方很难处理
public Optional<Optional<User>> findUser(Long id) {
    Optional<User> user = userRepo.findById(id);
    return Optional.of(user); // 多此一举！
}

// ✅ 正确：直接返回 Optional<User>
public Optional<User> findUser(Long id) {
    return userRepo.findById(id);
}

// ❌ 错误：flatMap 用错成 map，导致嵌套
Optional<String> city = Optional.ofNullable(user)
    .map(u -> Optional.ofNullable(u.getAddress()))  // 返回 Optional<Optional<Address>>
    .map(addr -> addr.map(Address::getCity));        // 很难用

// ✅ 正确：用 flatMap 展开
Optional<String> city = Optional.ofNullable(user)
    .flatMap(u -> Optional.ofNullable(u.getAddress()))  // 返回 Optional<Address>
    .map(Address::getCity);
```

### ❌ 坑2：在 Stream 中与 Optional 配合使用

```java
// 场景：从 ID 列表中查找用户，过滤掉不存在的
List<Long> ids = Arrays.asList(1L, 2L, 3L);

// ❌ 错误：map 返回 Optional，collect 得到 List<Optional<User>>
List<Optional<User>> users = ids.stream()
    .map(id -> userRepo.findById(id))
    .collect(Collectors.toList());

// ✅ 正确：用 flatMap 展开 Optional（Java 9+）
List<User> users = ids.stream()
    .map(id -> userRepo.findById(id))  // Stream<Optional<User>>
    .flatMap(Optional::stream)          // 展开：空 Optional 被过滤，有值的展开为元素
    .collect(Collectors.toList());

// Java 8 的写法（没有 Optional::stream）
List<User> users = ids.stream()
    .map(id -> userRepo.findById(id))
    .filter(Optional::isPresent)
    .map(Optional::get)
    .collect(Collectors.toList());
```

### ❌ 坑3：Optional 序列化问题

```java
// ❌ 错误：Optional 没有实现 Serializable，作为字段会导致序列化失败
public class UserDTO implements Serializable {
    private Optional<String> nickname; // 序列化时报错！
}

// ✅ 正确：字段用普通类型，在 getter 中返回 Optional
public class UserDTO {
    private String nickname; // 字段用普通类型

    public Optional<String> getNickname() {
        return Optional.ofNullable(nickname); // getter 返回 Optional
    }
}
```

### ❌ 坑4：orElse 的副作用陷阱

```java
// ❌ 危险：orElse 的参数无论是否为空都会被求值
// 如果 createDefaultUser() 有副作用（如写数据库），每次都会执行！
Optional<User> user = findUser(id);
User result = user.orElse(createDefaultUser()); // createDefaultUser() 每次都执行

// ✅ 正确：用 orElseGet，只在为空时才执行
User result = user.orElseGet(() -> createDefaultUser()); // 只在 user 为空时执行
```

<!-- nav-start -->

---

[⬅️ 上一篇：Stream API](08-[Java8]Stream流式编程.md) | [🏠 返回目录](../README.md) | [下一篇：新日期 API ➡️](10-[Java8]新日期API.md)

<!-- nav-end -->
