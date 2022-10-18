# 接口默认方法与静态方法

---

## 1. 引入：为什么需要默认方法？

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

## 2. 默认方法 vs 静态方法

| 特性 | 默认方法（default） | 静态方法（static） |
|------|-------------------|-----------------|
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

## 3. 多继承冲突解决规则

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

## 4. 面试高频问题

**Q：接口默认方法和抽象类有什么区别？**
> 1. 接口可以多实现，抽象类只能单继承；2. 接口默认方法不能有状态（字段），抽象类可以有实例字段；3. 接口默认方法主要用于向后兼容，抽象类用于代码复用和模板方法模式。

**Q：Java 8 接口可以有哪些类型的方法？**
> Java 8 接口可以有：1. 抽象方法（必须实现）；2. 默认方法（`default`，有实现，可覆盖）；3. 静态方法（`static`，有实现，不可覆盖）。Java 9 还增加了私有方法（`private`）。

**Q：为什么 Java 8 要给接口加默认方法？**
> 主要是为了向后兼容。Java 8 引入 Stream API 后，需要给 `Collection` 接口添加 `stream()`、`forEach()` 等方法。如果没有默认方法，所有实现了 `Collection` 的类都需要修改，影响面极大。

---

## 5. 工作中常见坑

### ❌ 坑1：把 default 方法当抽象类用（滥用）

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

### ❌ 坑2：default 方法与实现类方法的优先级混淆

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

### ❌ 坑3：接口静态方法不能被继承

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

### ❌ 坑4：Java 9 私有方法的使用场景

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