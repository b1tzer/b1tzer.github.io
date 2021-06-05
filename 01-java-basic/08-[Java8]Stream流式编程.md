<!-- nav-start -->

---

[⬅️ 上一篇：Lambda 表达式](07-[Java8]Lambda表达式.md) | [🏠 返回目录](../README.md) | [下一篇：Optional ➡️](09-[Java8]Optional空值处理.md)

<!-- nav-end -->

# Stream API

---

## 1. 引入：它解决了什么问题？

Stream API 让集合操作（过滤、转换、聚合）从命令式循环变为声明式链式调用，代码更简洁、可读性更强。

```java
// 传统写法：找出所有长度>3的名字，转大写，排序
List<String> names = Arrays.asList("Alice", "Bob", "Charlie", "Di");
List<String> result = new ArrayList<>();
for (String name : names) {
    if (name.length() > 3) {
        result.add(name.toUpperCase());
    }
}
Collections.sort(result);

// Stream 写法（链式，一目了然）
List<String> result = names.stream()
    .filter(name -> name.length() > 3)
    .map(String::toUpperCase)
    .sorted()
    .collect(Collectors.toList());
```

---

## 2. Stream 操作分类

```mermaid
flowchart LR
    A[数据源\nCollection/Array] --> B[中间操作\n惰性求值]
    B --> C[终止操作\n触发执行]

    subgraph 中间操作(返回Stream，不立即执行)
        D[filter 过滤]
        E[map 转换]
        F[flatMap 扁平化]
        G[sorted 排序]
        H[distinct 去重]
        I[limit/skip 截取]
        J[peek 调试]
    end

    subgraph 终止操作(返回结果，触发执行)
        K[collect 收集]
        L[forEach 遍历]
        M[count 计数]
        N[findFirst/findAny]
        O[anyMatch/allMatch]
        P[reduce 聚合]
    end
```

> **关键原理：惰性求值**
> 中间操作不会立即执行，只有遇到终止操作时才会触发整个流水线的执行。
> **为什么这样设计**：惰性求值允许短路优化——如 `findFirst()` 找到第一个就停止，不需要处理所有元素；`limit(10)` 只处理前 10 个元素，后面的中间操作根本不执行。

---

## 3. 常用操作示例

```java
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

// filter + collect：过滤偶数
List<Integer> evens = numbers.stream()
    .filter(n -> n % 2 == 0)
    .collect(Collectors.toList()); // [2, 4, 6, 8, 10]

// map：平方
List<Integer> squares = numbers.stream()
    .map(n -> n * n)
    .collect(Collectors.toList()); // [1, 4, 9, 16, ...]

// reduce：求和
int sum = numbers.stream()
    .reduce(0, Integer::sum); // 55

// groupingBy：按奇偶分组
Map<Boolean, List<Integer>> grouped = numbers.stream()
    .collect(Collectors.groupingBy(n -> n % 2 == 0));
// {false=[1,3,5,7,9], true=[2,4,6,8,10]}

// flatMap：扁平化嵌套列表
List<List<Integer>> nested = Arrays.asList(
    Arrays.asList(1, 2), Arrays.asList(3, 4));
List<Integer> flat = nested.stream()
    .flatMap(Collection::stream)
    .collect(Collectors.toList()); // [1, 2, 3, 4]
```

---

## 4. 综合实战

**需求**：从用户列表中找出年龄大于18岁的活跃用户，取其邮箱，去重后按字母排序。

```java
// 函数式写法：Stream + Lambda + Optional 组合
List<String> getActiveUserEmails(List<User> users) {
    return users.stream()
        .filter(u -> u.getAge() > 18 && u.isActive())  // 过滤条件
        .map(User::getEmail)                             // 提取邮箱
        .filter(Objects::nonNull)                        // 过滤空值
        .distinct()                                      // 去重
        .sorted()                                        // 排序
        .collect(Collectors.toList());                   // 收集结果
}
```

---

## 5. 工作中常见坑

| 坑点 | 问题描述 | 根本原因 | 解决方案 |
|------|---------|---------|---------|
| Stream 只能消费一次 | 对同一个 Stream 调用两次终止操作会抛异常 | Stream 是一次性的流水线，消费后状态变为"已关闭" | 每次从数据源重新创建 Stream |
| 并行流线程安全 | `parallelStream()` 操作非线程安全集合会出错 | 并行流在 ForkJoinPool 中多线程执行，共享状态会竞争 | 使用 `collect()` 而非直接 `add()` |
| 空指针异常 | `map()` 返回 null 后续操作 NPE | Stream 不会自动处理 null 值 | 使用 `filter(Objects::nonNull)` 或 Optional |
| 性能误区 | 小数据量用 Stream 反而更慢 | Stream 有创建流水线的开销，数据量小时开销占比大 | 数据量小时用普通 for 循环 |

### 坑点代码示例

```java
// ❌ 坑1：Stream 只能消费一次
Stream<String> stream = list.stream().filter(s -> s.length() > 3);
long count = stream.count();          // 第一次消费，OK
List<String> result = stream.collect(Collectors.toList()); // 抛 IllegalStateException！
// ✅ 每次重新创建
long count = list.stream().filter(s -> s.length() > 3).count();
List<String> result = list.stream().filter(s -> s.length() > 3).collect(Collectors.toList());

// ❌ 坑2：parallelStream 操作非线程安全集合
List<Integer> result = new ArrayList<>();
IntStream.range(0, 1000).parallel().forEach(result::add); // 数据丢失！
// ✅ 用 collect 收集，线程安全
List<Integer> result = IntStream.range(0, 1000).parallel()
    .boxed()
    .collect(Collectors.toList());

// ❌ 坑3：map 返回 null 导致后续 NPE
List<String> names = Arrays.asList("Alice", "Bob", "Charlie");
List<Integer> lengths = names.stream()
    .map(name -> name.equals("Bob") ? null : name.length()) // Bob 返回 null
    .collect(Collectors.toList()); // 不报错，但 list 中有 null
// 后续调用 lengths.stream().mapToInt(Integer::intValue) 会 NPE！
// ✅ 过滤 null
List<Integer> lengths = names.stream()
    .map(name -> name.equals("Bob") ? null : name.length())
    .filter(Objects::nonNull)
    .collect(Collectors.toList());

// ❌ 坑4：在 Stream 中修改外部集合（ConcurrentModificationException）
List<String> list = new ArrayList<>(Arrays.asList("a", "b", "c"));
list.stream().forEach(s -> {
    if (s.equals("b")) list.remove(s); // 抛 ConcurrentModificationException！
});
// ✅ 用 removeIf
list.removeIf(s -> s.equals("b"));

// ❌ 坑5：peek 用于调试可以，但不要用于修改状态（有副作用）
// peek 是中间操作，在某些短路场景下可能不执行
list.stream()
    .peek(s -> System.out.println("处理: " + s)) // 调试用，OK
    .filter(s -> s.length() > 1)
    .findFirst(); // 找到第一个就停止，后面的 peek 不会执行
```

---

## 6. 面试高频问题

**Q：Stream 的惰性求值是什么意思？**
> 中间操作（filter/map/sorted）不会立即执行，它们只是构建了一个操作流水线。只有当终止操作（collect/forEach/count）被调用时，整个流水线才会被触发执行。好处是可以进行短路优化（如 `findFirst()` 找到第一个就停止）。

**Q：Stream 和 for 循环哪个性能更好？**
> 数据量大时 Stream（尤其是 parallelStream）有优势；数据量小时 for 循环更快，因为 Stream 有创建流水线的额外开销。

**Q：parallelStream 一定比 stream 快吗？**
> 不一定。parallelStream 使用 ForkJoinPool 多线程执行，适合 CPU 密集型、数据量大的场景。如果任务本身很轻量或数据量小，线程切换的开销反而会使性能更差。

<!-- nav-start -->

---

[⬅️ 上一篇：Lambda 表达式](07-[Java8]Lambda表达式.md) | [🏠 返回目录](../README.md) | [下一篇：Optional ➡️](09-[Java8]Optional空值处理.md)

<!-- nav-end -->
