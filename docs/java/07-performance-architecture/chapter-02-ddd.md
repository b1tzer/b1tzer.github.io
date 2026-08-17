# 第2章 领域驱动设计（DDD）

> 当业务规则散落在无数个 if/else 中，当改一个需求要动十个类，当新来的开发者三个月看不懂代码——这不是人的问题，是建模的问题。本章回答：为什么传统 CRUD 会失效？DDD 的核心概念如何落地？如何从业务分析走向代码实现？

---

## 2.1 为什么传统 CRUD 会失效

传统 CRUD 开发模式在简单业务下高效无比：数据库表 → 实体类 → DAO → Service → Controller，一路生成，一天上线。但当业务复杂度超过某个阈值，CRUD 模式的弊端开始显现。

### CRUD 失效的典型症状

```java
// 一个"简单"的订单服务，随着需求迭代变成了这样
@Service
public class OrderService {

    public OrderDTO createOrder(CreateOrderRequest request) {
        // 校验库存
        if (inventoryService.getStock(request.getSkuId()) < request.getQuantity()) {
            throw new BizException("库存不足");
        }
        
        // 校验用户等级
        if (userService.getLevel(request.getUserId()) == VIP) {
            // VIP 打折
            price = price * 0.8;
            // 但特价商品不参与 VIP 折扣
            if (specialSkuService.isSpecial(request.getSkuId())) {
                price = originalPrice;
            }
        }
        
        // 优惠券逻辑
        if (request.getCouponId() != null) {
            Coupon coupon = couponService.getById(request.getCouponId());
            if (coupon.getType() == FIXED) {
                price = price - coupon.getAmount();
            } else if (coupon.getType() == PERCENT) {
                price = price * coupon.getDiscount();
            }
            // 满减券还要检查门槛
            if (coupon.getType() == THRESHOLD && price < coupon.getMinAmount()) {
                throw new BizException("未达到满减门槛");
            }
        }
        
        // 还有跨店满减、运费计算、预售逻辑、拼团逻辑...
        // 每加一个需求，这个方法就膨胀一圈
    }
}
```

问题的根源不是代码写得差，而是**业务规则没有被显式建模**。规则散落在 Service 的 if/else 中，变成了"隐式知识"——只有写代码的人知道完整逻辑，代码本身无法自解释。

### CRUD vs DDD 的核心差异

| 维度 | CRUD 思维 | DDD 思维 |
|------|----------|----------|
| 建模起点 | 数据库表结构 | 业务领域和业务规则 |
| 对象职责 | 数据载体（getter/setter） | 行为承担者（业务方法） |
| 业务逻辑位置 | Service 层 | 领域对象 + 领域服务 |
| 变更驱动 | "加个字段" | "业务规则变了" |
| 复杂度管理 | Service 类无限膨胀 | 限界上下文隔离复杂度 |
| 适用场景 | 简单 CRUD、管理后台 | 复杂业务规则、核心域 |

---

## 2.2 核心概念

DDD 有一套自己的术语体系。这些概念不是为了制造门槛，而是为了**用精确的语言描述业务现实**。

### 核心概念速查表

| 概念 | 定义 | 特征 | 举例 |
|------|------|------|------|
| **Entity（实体）** | 具有唯一标识的对象 | 有生命周期，标识不变内容可变 | 订单、用户、商品 |
| **Value Object（值对象）** | 没有唯一标识的对象 | 不可变，通过属性值相等判断 | 金额、地址、颜色 |
| **Aggregate（聚合）** | 一组相关对象的集合 | 有一个聚合根，外部只能通过聚合根访问 | 订单（根）+ 订单项 |
| **Bounded Context（限界上下文）** | 领域模型的边界 | 同一个词在不同上下文含义不同 | "商品"在库存域和订单域不同 |

### Entity vs Value Object

```java
// Entity：有唯一标识，即使所有属性相同也认为是不同对象
public class Order {
    private Long id;           // 唯一标识
    private String userId;
    private OrderStatus status;
    
    // 两个 Order 对象即使内容完全相同，id 不同就不是同一个订单
    public boolean equals(Object other) {
        if (!(other instanceof Order)) return false;
        return Objects.equals(this.id, ((Order) other).id);
    }
}

// Value Object：没有唯一标识，通过属性值判断相等，不可变
public class Money {
    private final BigDecimal amount;    // final → 不可变
    private final String currency;
    
    public Money(BigDecimal amount, String currency) {
        this.amount = amount;
        this.currency = currency;
    }
    
    // 两个 Money 对象金额和币种相同，就认为相等
    @Override
    public boolean equals(Object other) {
        if (!(other instanceof Money)) return false;
        Money that = (Money) other;
        return this.amount.compareTo(that.amount) == 0 
            && Objects.equals(this.currency, that.currency);
    }
    
    // 运算返回新对象，不修改自身
    public Money add(Money other) {
        assertSameCurrency(other);
        return new Money(this.amount.add(other.amount), this.currency);
    }
    
    public Money multiply(int quantity) {
        return new Money(this.amount.multiply(BigDecimal.valueOf(quantity)), this.currency);
    }
}
```

### Aggregate（聚合）

聚合是 DDD 中最重要的战术概念之一。它的核心规则是：

1. **聚合根是入口**：外部只能通过聚合根访问聚合内部的对象
2. **事务一致性边界**：一个事务只修改一个聚合
3. **聚合间通过 ID 引用**：不直接持有对方的对象引用

```java
// Order 是聚合根，OrderItem 是聚合内部对象
public class Order {
    private Long id;                    // 聚合根的唯一标识
    private String userId;
    private List<OrderItem> items;      // 聚合内部对象
    private Money totalAmount;
    private OrderStatus status;
    
    // 外部通过聚合根的方法操作内部对象
    public void addItem(String skuId, String skuName, int quantity, Money unitPrice) {
        if (status != OrderStatus.CREATED) {
            throw new BusinessException("已确认的订单不能添加商品");
        }
        OrderItem item = new OrderItem(skuId, skuName, quantity, unitPrice);
        this.items.add(item);
        this.recalculateTotal();
    }
    
    public void removeItem(String skuId) {
        if (items.size() <= 1) {
            throw new BusinessException("订单至少保留一个商品");
        }
        items.removeIf(item -> item.getSkuId().equals(skuId));
        this.recalculateTotal();
    }
    
    public void confirm() {
        if (items.isEmpty()) {
            throw new BusinessException("空订单不能确认");
        }
        this.status = OrderStatus.CONFIRMED;
    }
    
    private void recalculateTotal() {
        this.totalAmount = items.stream()
            .map(OrderItem::getSubtotal)
            .reduce(Money.ZERO, Money::add);
    }
}

// OrderItem 不能脱离 Order 被独立访问
public class OrderItem {
    private String skuId;
    private String skuName;
    private int quantity;
    private Money unitPrice;
    
    public Money getSubtotal() {
        return unitPrice.multiply(quantity);
    }
}
```

### Bounded Context（限界上下文）

同一个业务名词在不同上下文中含义不同。以电商系统中的"商品"为例：

| 属性 | 商品域（商品管理） | 库存域（仓储管理） | 订单域（交易） |
|------|-------------------|-------------------|---------------|
| 关注点 | 标题、描述、图片、规格 | 库位、批次、数量、效期 | SKU、名称、单价、数量 |
| "商品"含义 | 一个营销展示单元 | 一个可存储的实物 | 一次交易的行项 |
| 操作 | 上架、编辑、下架 | 入库、出库、盘点 | 加入购物车、下单 |

![ddd战略设计](/java/ddd战略设计.svg)

每个上下文内部有自己的领域模型，上下文之间通过 **ID 引用** 或 **事件通信**，绝不共享领域对象。

---

## 2.3 领域建模过程

领域建模不是画 UML 图的学术活动，而是**深入理解业务并用代码表达业务**的过程。

### 建模四步法

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 1. 业务分析   │ ──→ │ 2. 识别对象   │ ──→ │ 3. 划分上下文  │ ──→ │ 4. 代码落地   │
│              │     │              │     │              │     │              │
│ - 与领域专家  │     │ - 实体       │     │ - 限界上下文   │     │ - 领域模型    │
│   深度对话   │     │ - 值对象      │     │ - 上下文映射   │     │ - 领域服务    │
│ - 梳理业务流程│     │ - 聚合       │     │ - 团队边界    │     │ - 仓储       │
│ - 识别核心规则│     │ - 领域事件    │     │              │     │ - 应用服务    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### 第一步：业务分析（Event Storming）

Event Storming 是最有效的领域建模方法之一。核心流程：

1. **列出领域事件**（橙色便利贴）：业务中发生的事实，用过去时态
2. **找到触发命令**（蓝色便利贴）：什么操作导致了这个事件
3. **识别聚合**（黄色便利贴）：命令作用在什么对象上
4. **划定上下文边界**（粉色便利贴）：哪些聚合属于同一个业务边界

以电商下单为例：

```text
[用户浏览商品] → [加入购物车] → [提交订单] → [支付完成] → [仓库发货] → [用户确认收货]
     │                │              │             │            │
  商品上下文        购物车上下文      订单上下文     支付上下文     物流上下文
```

### 第三步：上下文映射

不同限界上下文之间的关系模式：

| 映射模式 | 描述 | 适用场景 |
|---------|------|---------|
| **共享内核 (Shared Kernel)** | 两个上下文共享部分模型 | 紧密协作的团队，变更需同步 |
| **客户-供应商 (Customer-Supplier)** | 下游依赖上游，上游提供接口 | 上游有义务满足下游需求 |
| **防腐层 (ACL)** | 下游建隔离层转换上游模型 | 调用外部系统或遗留系统 |
| **开放主机服务 (OHS)** | 上游提供标准化协议供多方消费 | 平台型服务 |
| **遵从者 (Conformist)** | 下游完全遵从上游模型 | 没有话语权的外部依赖 |

```java
// 防腐层示例：订单域调用商品域，通过 ACL 隔离
// 订单域自己的商品视图（不受商品域模型变更影响）
public class ProductReference {
    private final String productId;
    private final String productName;
    private final Money currentPrice;
}

// 防腐层：将商品域的模型转换为订单域的模型
@Component
public class ProductAntiCorruptionLayer {

    private final ProductQueryService productQueryService; // 商品域的对外接口

    public ProductReference toReference(String productId) {
        ProductDTO dto = productQueryService.getById(productId);
        return new ProductReference(
            dto.getId(),
            dto.getName(),
            new Money(dto.getPrice(), "CNY")
        );
    }
}
```

---

## 2.4 遗留系统如何引入 DDD

前面展示的是"理想状态下的 DDD"——从零开始建模。但读者面对的真实场景 90% 是**已有 CRUD 系统，如何渐进式引入 DDD**。推倒重来不现实，正确的策略是渐进式改造。

### 绞杀者模式（Strangler Fig Pattern）

像藤蔓缠绕大树一样，用新代码逐渐包裹旧代码，最终替换：

![ddd战略设计](/java/ddd战略设计.svg)

### 防腐层（ACL）隔离新旧代码

关键原则：**新代码不直接依赖旧代码**。通过防腐层隔离：

```java
// 旧系统的 UserService 返回的是贫血的 DTO
// 新领域的 Order 需要的是 User 聚合根
// 防腐层负责转换

@Component
public class UserAntiCorruptionLayer {

    private final LegacyUserService legacyService;  // 旧系统

    public User toDomain(String userId) {
        LegacyUserDTO dto = legacyService.getById(userId);
        // 将旧系统的 DTO 转换为新领域的聚合根
        return new User(
            new UserId(dto.getId()),
            dto.getName(),
            UserLevel.valueOf(dto.getLevel())
        );
    }
}
```

### 选择哪个子域开始

不要一上来就改造核心域（风险太大），从**支撑域**开始练手：

| 子域类型 | 示例 | 改造风险 | 推荐度 |
|---------|------|---------|--------|
| 核心域 | 订单、支付 | 高（业务关键） | ⭐⭐ 先不碰 |
| 支撑域 | 用户、地址、通知 | 中 | ⭐⭐⭐⭐ 推荐 |
| 通用域 | 日志、监控、文件 | 低 | ⭐⭐⭐ 可以练手 |

从支撑域开始，积累经验后再挑战核心域。

---

## 2.5 战术设计

战术设计是将领域模型落地为代码的具体实践。核心原则：**领域层不依赖任何框架**。

### 分层结构

```text
com.example.order
├── domain/                    ← 领域层（零框架依赖）
│   ├── Order.java             ← 聚合根
│   ├── OrderItem.java         ← 实体
│   ├── OrderStatus.java       ← 值对象/枚举
│   ├── Money.java             ← 值对象
│   ├── OrderRepository.java   ← 仓储接口（端口）
│   └── OrderDomainService.java← 领域服务
│
├── application/               ← 应用层（编排用例）
│   ├── CreateOrderUseCase.java
│   ├── CreateOrderCommand.java
│   └── OrderQueryService.java
│
└── infrastructure/            ← 基础设施层（技术实现）
    ├── JpaOrderRepository.java    ← 仓储实现（适配器）
    ├── OrderJpaEntity.java        ← 持久化实体
    └── OrderEventListener.java
```

### Repository 模式

```java
// ===== 领域层：定义接口（端口） =====
// 注意：这里用的是领域对象，不是持久化实体
public interface OrderRepository {
    Order findById(OrderId id);
    void save(Order order);
    List<Order> findByUserId(String userId);
}

// ===== 基础设施层：实现接口（适配器） =====
@Repository
public class JpaOrderRepository implements OrderRepository {

    private final SpringDataOrderJpa jpa;
    private final OrderMapper mapper;

    @Override
    public Order findById(OrderId id) {
        OrderEntity entity = jpa.findById(id.getValue())
            .orElseThrow(() -> new OrderNotFoundException(id));
        return mapper.toDomain(entity); // 持久化实体 → 领域对象
    }

    @Override
    public void save(Order order) {
        OrderEntity entity = mapper.toEntity(order); // 领域对象 → 持久化实体
        jpa.save(entity);
    }
}
```

### Domain Service vs Application Service

这两个"Service"容易混淆，区别如下：

| 维度 | Domain Service | Application Service |
|------|---------------|---------------------|
| 职责 | 处理跨聚合的业务规则 | 编排用例流程 |
| 是否有状态 | 无状态 | 无状态 |
| 依赖 | 只依赖领域层 | 依赖领域层 + 基础设施接口 |
| 是否管理事务 | 否 | 是 |
| 典型场景 | 转账（涉及两个账户聚合） | 创建订单（校验→创建→保存→发事件） |

```java
// Domain Service：处理跨聚合的业务逻辑
// "从账户A转账到账户B"涉及两个聚合，不属于任何一个聚合的行为
public class TransferDomainService {

    public void transfer(Account from, Account to, Money amount) {
        if (!from.canTransfer(amount)) {
            throw new BusinessException("余额不足");
        }
        from.debit(amount);
        to.credit(amount);
        // 注意：Domain Service 不负责持久化，那是 Application Service 的事
    }
}

// Application Service：编排用例流程
@Service
@Transactional
public class CreateOrderApplicationService {

    private final OrderRepository orderRepository;
    private final ProductAntiCorruptionLayer productACL;
    private final ApplicationEventPublisher eventPublisher;

    public OrderId execute(CreateOrderCommand command) {
        // 1. 通过防腐层获取商品信息
        ProductReference product = productACL.toReference(command.getProductId());

        // 2. 创建订单（聚合根的行为）
        Order order = Order.create(
            command.getUserId(),
            product.getProductId(),
            product.getProductName(),
            command.getQuantity(),
            product.getCurrentPrice()
        );

        // 3. 持久化
        orderRepository.save(order);

        // 4. 发布领域事件
        eventPublisher.publishEvent(new OrderCreatedEvent(order.getId()));

        return order.getId();
    }
}
```

### 领域层不依赖框架

这是 DDD 战术设计最重要的原则：

```java
// ❌ 错误：领域对象依赖 JPA 注解
@Entity
@Table(name = "t_order")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id")
    private String userId;
    
    @Enumerated(EnumType.STRING)
    private OrderStatus status;
}

// ✅ 正确：领域对象是纯 Java 对象
public class Order {
    private OrderId id;
    private String userId;
    private List<OrderItem> items;
    private Money totalAmount;
    private OrderStatus status;
    private Instant createdAt;
    
    // 业务行为
    public void confirm() {
        if (this.status != OrderStatus.CREATED) {
            throw new BusinessException("只有待确认的订单才能确认");
        }
        this.status = OrderStatus.CONFIRMED;
    }
    
    public void cancel(String reason) {
        if (this.status == OrderStatus.SHIPPED) {
            throw new BusinessException("已发货的订单不能取消");
        }
        this.status = OrderStatus.CANCELLED;
    }
}
```

领域对象不 import 任何框架包（Spring、JPA、Jackson 等），它是**可独立测试、可独立演进的纯业务表达**。当框架升级或更换时，领域层纹丝不动。

---

> **DDD 不是银弹，但它是管理复杂业务的有效武器。** 本章的概念需要在实际项目中反复实践才能真正掌握。第1章的架构模式为代码提供了骨架，DDD 为骨架填充了血肉。接下来的第3章，我们将视角从"怎么建"转向"怎么扛"——当系统面临高并发流量时，架构设计又有哪些新的考量？

