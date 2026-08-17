# 第1章 架构思想与分层设计

> 一个系统拆成 20 个微服务，结果部署时要协调 20 个团队，联调三天才能上线。另一个系统全塞在一个单体里，改一行代码要回归整个系统。过度设计和不足设计都是死路。本章回答三个问题：什么是软件架构？经典分层、六边形、Clean Architecture 各自解决什么问题？怎么在"拆太碎"和"揉成一坨"之间找到平衡？

---

## 1.1 什么是软件架构

很多开发者把"架构"等同于"框架选型"或"技术栈"，这是一个常见的误解。软件架构是关于**系统结构的决策集合**——它决定了系统由哪些组件构成、组件之间如何协作、变化发生时哪些部分会受到影响。

### 代码设计 vs 架构设计

| 维度 | 代码设计 | 架构设计 |
|------|----------|----------|
| 关注粒度 | 类、方法、算法 | 模块、子系统、服务 |
| 核心问题 | 这段代码怎么写更优雅？ | 系统应该拆成几块？块之间怎么通信？ |
| 变化频率 | 高（每次 PR 都在改） | 低（重构架构是大工程） |
| 影响范围 | 局部（一个类或一个包） | 全局（整个系统的技术走向） |
| 典型产物 | 设计模式、算法优化 | 分层图、部署拓扑、接口契约 |
| 失败代价 | 技术债、可读性差 | 系统无法扩展、团队协作混乱 |

用一句话概括：**代码设计决定质量，架构设计决定命运。**

```java
// 代码设计层面：选择合适的数据结构
Map<String, List<Order>> ordersByRegion = orders.stream()
    .collect(Collectors.groupingBy(Order::getRegion));

// 架构设计层面：订单域应该独立为服务，还是放在单体里？
// 这个决策影响的是团队边界、部署方式、数据一致性策略
```

架构不是画 PPT 时的方框图，而是**约束未来变更方向的决策**。好的架构让常见的变更（加功能、换存储、扩容量）容易，让危险的变更（跨域修改、数据不一致）困难。

---

## 1.2 架构演进规律

架构不是一成不变的，它随着业务规模和团队规模共同演进。以下是常见的演进路径：

![arch-evolution](/java/arch-evolution.svg)

### 各阶段特征

| 阶段 | 适用规模 | 优势 | 劣势 |
|------|---------|------|------|
| 单体 | 1-5 人团队，初期产品 | 简单、部署方便、调试容易 | 模块耦合，无法独立扩展 |
| 垂直拆分 | 5-20 人，多个业务线 | 按业务隔离，独立开发部署 | 重复代码，跨系统调用复杂 |
| SOA | 20-100 人，企业级系统 | 服务复用，ESB 统一治理 | ESB 成为瓶颈，XML 配置繁琐 |
| 微服务 | 100+ 人，快速迭代业务 | 独立部署、技术栈自由、弹性扩缩 | 分布式复杂度、运维成本高 |
| 云原生 | 超大规模，多云部署 | 基础设施抽象、自动弹性、可观测 | 学习曲线陡峭，工具链复杂 |

### 过度设计与不足设计

架构演进中最大的陷阱不是选错了某种模式，而是**时机不对**：

```text
        过度设计                          不足设计
  ┌─────────────────┐            ┌─────────────────┐
  │ 5 个人的团队      │            │ 日活百万的系统     │
  │ 上微服务 + K8s    │            │ 还在单体里硬扛     │
  │ 运维成本 > 开发成本│            │ 一个模块挂全站瘫痪  │
  └─────────────────┘            └─────────────────┘
          ↑                              ↑
    "用大炮打蚊子"                  "温水煮青蛙"
```

**经验法则**：架构应该匹配**当前团队规模 × 业务复杂度**，而不是想象中的未来。Martin Fowler 的 "Monolith First" 建议——先用单体跑通业务，等痛点明确后再拆分——至今仍然适用。

---

## 1.3 Conway 定律与架构约束

技术约束大家都能想到：用户规模、成本、性能。但有一个约束比它们都大，却经常被忽略——**人**。

### Conway 定律

> "设计系统的组织，其产生的设计等同于组织之间的沟通结构。" —— Melvin Conway, 1967

用人话说：**系统架构会 mirror 团队结构。**

```text
3 人团队硬拆 6 个微服务：
  服务 A（无人维护）→ 版本落后 → 成为技术债
  服务 B（张三维护）→ 张三离职 → 无人能改
  服务 C、D、E、F → 同样的问题

3 个团队各 5 人，坚持单体架构：
  团队 A 改了订单模块 → 冲突了团队 B 的支付模块
  团队 B 等团队 A 发布 → 交付周期拉长
  合并冲突、代码审查、发布协调 → 效率暴跌
```

### 架构决策的非技术约束

| 约束类型 | 示例 | 影响 |
|---------|------|------|
| 团队规模 | 3 人团队不适合微服务 | 运维成本 > 开发收益 |
| 团队分布 | 跨时区团队需要服务解耦 | 同步协作成本太高 |
| 技术栈 | 团队只熟悉 Java，不熟悉 Go | 强行换栈的学习成本 |
| 组织边界 | 两个部门各管一个服务 | API 契约成为部门边界 |

**经验法则**：先看团队结构，再定架构。如果团队只有 5 个人，单体 + 模块化是最佳选择。等团队增长到 20+ 人、模块间的沟通成本超过拆分成本时，再考虑微服务。

---

## 1.4 分层架构

分层架构是最经典、最广泛使用的架构模式。其核心思想是**将系统按职责划分为不同的层，每层只与相邻层交互**。

### 经典三层架构

```text
┌─────────────────────────────────────────┐
│         表现层 (Presentation)            │
│   Controller / REST API / View          │
│   职责：接收请求、参数校验、返回响应        │
├─────────────────────────────────────────┤
│         业务层 (Business)                │
│   Service / Use Case                    │
│   职责：业务逻辑、事务管理、权限控制        │
├─────────────────────────────────────────┤
│         数据层 (Data Access)             │
│   Repository / DAO / Mapper             │
│   职责：数据持久化、SQL 封装、缓存访问      │
└─────────────────────────────────────────┘
```

### Spring Boot 分层实践

```java
// ===== 表现层 =====
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<OrderDTO> createOrder(@RequestBody @Valid CreateOrderRequest request) {
        // Controller 只做：接收请求 → 调用 Service → 返回响应
        OrderDTO order = orderService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }
}

// ===== 业务层 =====
@Service
@Transactional
public class OrderService {

    private final OrderRepository orderRepository;
    private final InventoryService inventoryService;
    private final PaymentGateway paymentGateway;

    public OrderDTO createOrder(CreateOrderRequest request) {
        // 1. 业务校验
        // 2. 扣减库存
        // 3. 创建订单
        // 4. 发起支付
        // 这里是业务规则的核心，不关心数据怎么存、接口怎么调
        Order order = Order.create(request.getUserId(), request.getItems());
        inventoryService.deduct(order.getItems());
        orderRepository.save(order);
        return OrderDTO.from(order);
    }
}

// ===== 数据层 =====
@Repository
public class JpaOrderRepository implements OrderRepository {

    private final SpringDataOrderJpa jpa;

    public JpaOrderRepository(SpringDataOrderJpa jpa) {
        this.jpa = jpa;
    }

    @Override
    public void save(Order order) {
        // 将领域对象转换为持久化实体
        OrderEntity entity = OrderEntity.fromDomain(order);
        jpa.save(entity);
    }
}
```

### 分层架构的规则

1. **上层依赖下层**：Controller → Service → Repository，不能反向依赖
2. **同层不直接调用**：OrderService 不能直接调用 UserService 的 Repository，要通过 Service 层
3. **每一层有明确的职责边界**：Controller 不写业务逻辑，Service 不写 SQL，Repository 不做业务判断

违反这些规则时，代码会逐渐变成"意大利面条"——Controller 里出现 SQL，Repository 里出现 if/else 业务判断，最终分层形同虚设。

---

## 1.5 六边形架构

传统分层架构的问题在于：**业务逻辑和技术实现耦合在一起**。当你想把 MySQL 换成 MongoDB，或者把 REST API 换成 gRPC，改动会渗透到业务层。

六边形架构（Hexagonal Architecture），又称 Ports & Adapters，由 Alistair Cockburn 在 2005 年提出。其核心思想是：**业务核心在中心，外部世界通过端口和适配器与业务交互**。

![hexagonal-arch](/java/hexagonal-arch.svg)

### 代码落地

```java
// ===== 端口（接口定义） =====
// 输入端口：业务提供什么能力
public interface OrderUseCase {
    OrderDTO createOrder(CreateOrderRequest request);
    OrderDTO getOrder(Long orderId);
}

// 输出端口：业务需要什么基础设施
public interface OrderRepository {
    void save(Order order);
    Optional<Order> findById(Long id);
}

public interface PaymentGateway {
    PaymentResult charge(Long orderId, BigDecimal amount);
}

// ===== 业务核心（纯 Java，无框架注解） =====
public class Order {
    private Long id;
    private String userId;
    private List<OrderItem> items;
    private OrderStatus status;
    private BigDecimal totalAmount;

    public static Order create(String userId, List<OrderItem> items) {
        if (items == null || items.isEmpty()) {
            throw new BusinessException("订单至少包含一个商品");
        }
        Order order = new Order();
        order.userId = userId;
        order.items = items;
        order.status = OrderStatus.CREATED;
        order.totalAmount = items.stream()
            .map(OrderItem::getSubtotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return order;
    }
}

// ===== 适配器（输入端 - REST） =====
@RestController
@RequestMapping("/api/orders")
public class OrderRestController {

    private final OrderUseCase orderUseCase;

    @PostMapping
    public ResponseEntity<OrderDTO> create(@RequestBody @Valid CreateOrderRequest req) {
        return ResponseEntity.ok(orderUseCase.createOrder(req));
    }
}

// ===== 适配器（输出端 - JPA） =====
@Repository
public class JpaOrderAdapter implements OrderRepository {

    private final SpringDataOrderJpa jpa;

    @Override
    public void save(Order order) {
        jpa.save(OrderEntity.fromDomain(order));
    }
}
```

六边形架构的关键收益：**业务核心零外部依赖**。你可以把 REST 换成 gRPC（换输入适配器），把 MySQL 换成 MongoDB（换输出适配器），业务代码一行不动。

---

## 1.6 Clean Architecture

Robert C. Martin（Uncle Bob）在 2012 年提出的 Clean Architecture，是六边形架构思想的进一步抽象。它用**同心圆**描述依赖方向：**依赖只能从外向内，永远不能从内向外**。

```text
            ┌─────────────────────────────────────┐
            │         Frameworks & Drivers         │
            │   (Web框架、数据库驱动、外部服务)       │
            │  ┌───────────────────────────────┐   │
            │  │      Interface Adapters       │   │
            │  │  (Controller、Gateway、Presenter)│  │
            │  │  ┌─────────────────────────┐   │   │
            │  │  │    Application Business  │   │   │
            │  │  │    Rules (Use Cases)     │   │   │
            │  │  │  ┌───────────────────┐   │   │   │
            │  │  │  │  Enterprise       │   │   │   │
            │  │  │  │  Business Rules   │   │   │   │
            │  │  │  │  (Domain Model)   │   │   │   │
            │  │  │  └───────────────────┘   │   │   │
            │  │  └─────────────────────────┘   │   │
            │  └───────────────────────────────┘   │
            └─────────────────────────────────────┘
                 依赖方向：外 ───────────→ 内
```

### 四层职责

| 层 | 职责 | Java 对应 |
|----|------|-----------|
| Enterprise Business Rules | 核心领域模型，业务实体和值对象 | `Order`, `Money`, `Address` |
| Application Business Rules | 用例编排，调用领域对象完成业务流程 | `CreateOrderUseCase` |
| Interface Adapters | 数据格式转换，连接用例与外部世界 | `OrderController`, `JpaOrderRepository` |
| Frameworks & Drivers | 具体技术实现 | Spring Boot, MySQL Driver, Redis |

### 核心原则：依赖规则

```java
// ✅ 正确：外层依赖内层（Adapter → UseCase）
public class OrderController {
    private final CreateOrderUseCase useCase; // 依赖接口（内层定义）
}

// ❌ 错误：内层依赖外层（Domain → Framework）
public class Order {
    // 千万不要在领域对象里用 @Entity、@Column 等 JPA 注解
    // 这会让领域层依赖持久化框架
}
```

**Dependency Inversion Principle（依赖倒置）** 是实现这一原则的关键：内层定义接口（Port），外层实现接口（Adapter）。内层不知道外层的存在，但外层知道内层需要什么。

### Clean Architecture vs 六边形架构

两者本质相同，只是表达方式不同：

| 对比项 | 六边形架构 | Clean Architecture |
|--------|-----------|-------------------|
| 核心隐喻 | 端口与适配器 | 同心圆 |
| 依赖方向 | 外部 → 端口 → 核心 | 外层 → 内层 |
| 业务核心 | Domain Model | Enterprise Business Rules |
| 用例层 | 放在端口定义中 | 独立为 Application Business Rules |
| 实际差异 | 几乎没有 | Clean Architecture 更强调用例层的独立性 |

---

## 1.7 模块边界设计

无论选择哪种架构风格，最终落地都要靠**模块边界**来保障。好的模块边界是架构的"防波堤"——变化发生时，边界阻止变化扩散。

### 高内聚、低耦合

```text
    高内聚（模块内部紧密相关）         低耦合（模块之间松散依赖）

    ┌─────────────────┐           ┌────────┐    ┌────────┐
    │  Order 模块      │           │ Order  │    │ User   │
    │  - Order         │           │ Module │◄──►│ Module │
    │  - OrderItem     │           │        │    │        │
    │  - OrderService  │           └────────┘    └────────┘
    │  - OrderRepo     │               仅通过接口通信
    └─────────────────┘
      内部元素高度相关
```

### 单一职责原则在模块层面的应用

```java
// ❌ 反模式：一个 Service 做所有事
@Service
public class GodService {
    // 订单相关
    public void createOrder() { ... }
    public void cancelOrder() { ... }
    
    // 用户相关
    public void registerUser() { ... }
    public void updateProfile() { ... }
    
    // 支付相关
    public void processPayment() { ... }
    public void refund() { ... }
    
    // 通知相关
    public void sendEmail() { ... }
    public void sendSms() { ... }
}

// ✅ 正确：按领域拆分模块
// order 模块
public class OrderService { /* 只管订单 */ }

// user 模块
public class UserService { /* 只管用户 */ }

// payment 模块
public class PaymentService { /* 只管支付 */ }

// notification 模块
public class NotificationService { /* 只管通知 */ }
```

### 模块间通信的两种模式

```java
// 模式一：直接方法调用（单体内模块间）
// 适用于：同一进程内的模块交互
public class OrderService {
    private final PaymentService paymentService;
    
    public void createOrder(OrderRequest request) {
        Order order = Order.create(request);
        paymentService.charge(order.getId(), order.getTotalAmount());
    }
}

// 模式二：事件驱动（松耦合）
// 适用于：模块间需要解耦，或跨服务通信
public class OrderService {
    private final ApplicationEventPublisher eventPublisher;
    
    public void createOrder(OrderRequest request) {
        Order order = Order.create(request);
        orderRepository.save(order);
        eventPublisher.publishEvent(new OrderCreatedEvent(order.getId(), order.getTotalAmount()));
        // 不直接调用 PaymentService，由事件监听器处理
    }
}

@Component
public class PaymentEventListener {
    @EventListener
    public void onOrderCreated(OrderCreatedEvent event) {
        paymentService.charge(event.getOrderId(), event.getAmount());
    }
}
```

### 边界守护实践

```java
// 方案一：访问控制（包级别）
// order 模块的内部实现放在 impl 包下，只暴露接口
com.example.order
├── OrderService.java          // 公开接口
├── OrderDTO.java              // 公开数据传输对象
└── impl/
    ├── OrderServiceImpl.java  // 内部实现
    ├── Order.java             // 领域对象
    └── OrderMapper.java       // 内部转换

// 方案二：ArchUnit 架构测试（自动化守护）
@Test
void serviceShouldNotDependOnController() {
    noClasses()
        .that().resideInAPackage("..service..")
        .should().dependOnClassesThat()
        .resideInAPackage("..controller..")
        .check(importedClasses);
}

@Test
void domainShouldNotDependOnInfrastructure() {
    noClasses()
        .that().resideInAPackage("..domain..")
        .should().dependOnClassesThat()
        .resideInAPackage("..infrastructure..")
        .check(importedClasses);
}
```

模块边界不是画出来的，而是**守出来的**。没有自动化测试守护的边界，迟早会被破坏。

---

> **架构不是目的，演进才是。** 本章介绍的分层架构、六边形架构、Clean Architecture，各有适用场景。初学者从三层起步，业务复杂时引入六边形/Clean Architecture 的思想，不要一开始就追求"完美架构"。第2章将在架构基础上深入领域建模——DDD 是让架构"长对肉"的关键方法论。第3章则从架构转向性能，探讨高并发场景下的系统设计策略。

