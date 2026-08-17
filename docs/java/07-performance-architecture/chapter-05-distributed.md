# 第5章 分布式系统核心问题

> 当你的系统从一台机器变成几十台、上百台时，原本理所当然的事情——比如"写入成功就能读到"——突然不再成立了。本章从 CAP 理论出发，系统讲解分布式环境下的一致性、事务和锁三大核心问题，帮你建立面对分布式系统的正确思维模型。

---

## 5.1 CAP 理论

### 5.1.1 C、A、P 分别是什么

CAP 定理由 Eric Brewer 于 2000 年提出，2002 年被 Seth Gilbert 和 Nancy Lynch 证明。它指出分布式系统**最多同时满足三项中的两项**：

| 属性 | 全称 | 含义 | 通俗解释 |
|------|------|------|---------|
| **C** | Consistency（一致性） | 所有节点在同一时刻看到相同的数据 | 写入成功后，任何节点读到的都是最新值 |
| **A** | Availability（可用性） | 每个请求都能收到非错误的响应 | 不会因为某个节点故障而拒绝服务 |
| **P** | Partition Tolerance（分区容错） | 网络分区时系统仍能继续工作 | 节点间通信中断时，系统不崩溃 |

### 5.1.2 P 是必须面对的现实

在分布式系统中，网络分区（节点间通信中断）是**必然会发生的**——网线可能被挖断、交换机可能宕机、机房之间的网络可能抖动。因此：

> **P 不是一个可选项，而是分布式系统的前提条件。**

所谓的"三选二"实际上变成了"在 P 的前提下，C 和 A 二选一"：

```text
         C (一致性)
        / \
       /   \
      /     \
     /  CA   \      ← 单机数据库（不存在分区问题）
    /_________\
   A           P

   在分布式环境中（P 必须满足）：
   
   CP 系统：分区时牺牲可用性，保证一致性
   AP 系统：分区时牺牲一致性，保证可用性
```

### 5.1.3 CP vs AP：经典选择

| 选择 | 代表系统 | 行为 | 适用场景 |
|------|---------|------|---------|
| **CP** | ZooKeeper、Etcd、HBase、MongoDB（默认） | 分区时拒绝部分写入，保证数据一致 | 配置中心、分布式锁、金融核心 |
| **AP** | Cassandra、Eureka、DynamoDB、CouchDB | 分区时继续服务，允许数据暂时不一致 | 社交动态、购物车、用户画像 |

```java
// ZooKeeper（CP 系统）：分区时客户端会收到连接丢失异常
try {
    zk.setData("/config/db-url", newData, -1);
} catch (KeeperException.ConnectionLossException e) {
    // 网络分区时，ZK 选择不提供服务（牺牲 A）
    // 客户端需要重试或等待分区恢复
    log.warn("ZK 连接丢失，等待重连...");
}

// Eureka（AP 系统）：分区时各节点继续提供服务
// 客户端可能拿到过期的服务列表（牺牲 C）
// 但系统不会因为某个节点不可达而拒绝服务
```

### 5.1.4 超越 CAP：PACELC 模型

CAP 只讨论了分区发生时的选择，但**没有网络分区时**也存在权衡。PACELC 模型补充了这一点：

```text
如果 Partition (P):
    选择 Availability (A) 或 Consistency (C)
Else (正常运行):
    选择 Latency (L) 或 Consistency (C)
```

| 系统 | PACELC 分类 | 说明 |
|------|-------------|------|
| ZooKeeper | PC/EC | 分区时选 C，正常时也选 C |
| Cassandra | PA/EL | 分区时选 A，正常时选低延迟 |
| MongoDB | PA/EC | 分区时选 A，正常时选 C |

---

## 5.2 一致性模型

### 5.2.1 从强到弱的光谱

一致性不是一个非黑即白的概念，而是一个从强到弱的光谱：

```text
强一致 ──────────────────────────────────────── 弱一致
  │                                                │
  │   线性一致   顺序一致   因果一致   最终一致   无保证  │
  │   (Linearizable)                          (No Guarantee)│
  └───────────────────────────────────────────────┘
```

| 一致性级别 | 定义 | 延迟 | 示例 |
|-----------|------|------|------|
| **线性一致（Linearizable）** | 读写表现得像只有一个副本 | 最高 | ZooKeeper、Etcd |
| **顺序一致（Sequential）** | 所有操作有全局顺序，但可能不是实时的 | 高 | Raft 共识算法 |
| **因果一致（Causal）** | 有因果关系的操作保持顺序 | 中 | 评论回复的顺序 |
| **最终一致（Eventual）** | 停止写入后，所有副本最终会一致 | 低 | DNS、CDN、Eureka |

### 5.2.2 最终一致性的工程实践

最终一致性是互联网系统最常用的模型，但"最终"到底有多最终？需要明确：

```java
// 写入后立即读取可能读到旧数据（最终一致性场景）
// 解决方案1：读写绑定（Read-Your-Writes）
public class ReadYourWritesSession {
    private String lastWriteTimestamp;  // 记录上次写入的时间戳

    public void write(String key, String value) {
        redis.set(key, value);
        this.lastWriteTimestamp = System.currentTimeMillis() + "";
    }

    public String read(String key) {
        // 从可能有最新数据的副本读取
        return redis.get(key, this.lastWriteTimestamp);
    }
}

// 解决方案2：版本号比对
public String readWithVersion(String key, long expectedVersion) {
    long maxRetries = 3;
    for (int i = 0; i < maxRetries; i++) {
        VersionedValue v = redis.getVersioned(key);
        if (v.getVersion() >= expectedVersion) {
            return v.getValue();
        }
        Thread.sleep(50 * (i + 1));  // 退避等待副本同步
    }
    throw new ConsistencyException("副本同步超时");
}
```

### 5.2.3 一致性与性能的权衡

| 维度 | 强一致 | 最终一致 |
|------|-------|---------|
| 读延迟 | 高（需确认副本） | 低（就近读取） |
| 写延迟 | 高（需多数确认） | 低（主副本确认即可） |
| 可用性 | 受限（需多数节点在线） | 高（单节点可服务） |
| 吞吐量 | 低 | 高 |
| 典型应用 | 库存扣减、账户余额 | 商品详情、用户评论 |

---

## 5.3 分布式事务

### 5.3.1 为什么需要分布式事务

当一个业务操作跨多个服务、多个数据库时，本地事务无法保证原子性：

```text
用户下单：
  1. 订单服务 → 创建订单（订单库）
  2. 库存服务 → 扣减库存（库存库）
  3. 账户服务 → 扣减余额（账户库）

  如果步骤 3 失败了，步骤 1 和 2 怎么办？
```

### 5.3.2 两阶段提交（2PC）

```text
阶段1：准备（Prepare）          阶段2：提交（Commit/Rollback）

  ┌──────────┐                   ┌──────────┐
  │ 协调者    │                   │ 协调者    │
  └────┬─────┘                   └────┬─────┘
       │ Prepare                      │ Commit
  ┌────┼────────┐                ┌────┼────────┐
  │    │        │                │    │        │
  ▼    ▼        ▼                ▼    ▼        ▼
┌───┐┌───┐  ┌───┐            ┌───┐┌───┐  ┌───┐
│ A ││ B │  │ C │            │ A ││ B │  │ C │
│YES││YES│  │YES│            │ ✓ ││ ✓ │  │ ✓ │
└───┘└───┘  └───┘            └───┘└───┘  └───┘
```

```java
// 基于数据库 XA 协议的 2PC 实现（以 Atomikos 为例）
@Configuration
public class XaDataSourceConfig {

    @Bean
    public DataSource orderDataSource() {
        MysqlXaDataSource xa = new MysqlXaDataSource();
        xa.setUrl("jdbc:mysql://order-host:3306/order_db");
        xa.setUser("root");
        xa.setPassword("****");
        return new AtomikosDataSourceBean(xa);
    }

    @Bean
    public DataSource inventoryDataSource() {
        MysqlXaDataSource xa = new MysqlXaDataSource();
        xa.setUrl("jdbc:mysql://inventory-host:3306/inventory_db");
        xa.setUser("root");
        xa.setPassword("****");
        return new AtomikosDataSourceBean(xa);
    }
}

// 使用 JTA 管理分布式事务
@Service
public class OrderService {

    @Transactional  // Atomikos 自动协调 XA 事务
    public void createOrder(OrderRequest request) {
        orderDao.insert(request.getOrder());       // 数据库 1
        inventoryDao.deduct(request.getItems());    // 数据库 2
        // 任一操作失败，两个数据库都会回滚
    }
}
```

### 5.3.3 TCC（Try-Confirm-Cancel）

TCC 将一个分布式事务拆成三个阶段，每个阶段都是本地事务：

```java
// TCC 模式示例：订单创建
// 1. Try：预留资源
@Service
public class OrderTccService {

    @TwoPhaseBusinessAction(
        name = "createOrder",
        commitMethod = "confirm",
        rollbackMethod = "cancel"
    )
    public boolean tryCreate(
            BusinessActionContext context,
            @BusinessActionContextParameter(paramName = "order") Order order) {
        // 冻结库存（不是真正扣减）
        inventoryDao.freeze(order.getProductId(), order.getQuantity());
        // 冻结余额（不是真正扣减）
        accountDao.freeze(order.getUserId(), order.getAmount());
        // 创建预订单（状态：待确认）
        orderDao.insert(order, OrderStatus.TRYING);
        return true;
    }

    // 2. Confirm：确认提交
    public boolean confirm(BusinessActionContext context) {
        Order order = (Order) context.getActionContext("order");
        inventoryDao.confirmFreeze(order.getProductId(), order.getQuantity());
        accountDao.confirmFreeze(order.getUserId(), order.getAmount());
        orderDao.updateStatus(order.getId(), OrderStatus.CONFIRMED);
        return true;
    }

    // 3. Cancel：回滚释放
    public boolean cancel(BusinessActionContext context) {
        Order order = (Order) context.getActionContext("order");
        inventoryDao.releaseFreeze(order.getProductId(), order.getQuantity());
        accountDao.releaseFreeze(order.getUserId(), order.getAmount());
        orderDao.updateStatus(order.getId(), OrderStatus.CANCELLED);
        return true;
    }
}
```

### 5.3.4 Saga 模式

Saga 将长事务拆成一系列本地事务，每个事务有对应的补偿操作：

```text
正向流程：T1 → T2 → T3 → T4（成功）
补偿流程：T1 → T2 → T3(失败) → C2 → C1（回滚）

T1: 创建订单    →  C1: 取消订单
T2: 扣减库存    →  C2: 恢复库存
T3: 扣减余额    →  C3: 恢复余额
T4: 通知发货    →  C4: 取消发货
```

```java
// Saga 编排模式（基于状态机）
@Component
public class OrderSaga {

    @SagaCompensable(cancelMethod = "cancelCreateOrder")
    public void createOrder(Order order) {
        orderDao.insert(order);
    }

    @SagaCompensable(cancelMethod = "cancelDeductInventory")
    public void deductInventory(Order order) {
        inventoryDao.deduct(order.getProductId(), order.getQuantity());
    }

    @SagaCompensable(cancelMethod = "cancelDeductBalance")
    public void deductBalance(Order order) {
        accountDao.deduct(order.getUserId(), order.getAmount());
    }

    // 补偿方法
    public void cancelCreateOrder(Order order) {
        orderDao.cancel(order.getId());
    }

    public void cancelDeductInventory(Order order) {
        inventoryDao.restore(order.getProductId(), order.getQuantity());
    }

    public void cancelDeductBalance(Order order) {
        accountDao.refund(order.getUserId(), order.getAmount());
    }
}
```

### 5.3.5 分布式事务方案对比

| 维度 | 2PC/XA | TCC | Saga | 本地消息表 |
|------|--------|-----|------|-----------|
| **原理** | 协调者统一 Prepare/Commit | 预留→确认→取消 | 正向操作+补偿操作 | 消息表+定时轮询 |
| **一致性** | 强一致 | 最终一致 | 最终一致 | 最终一致 |
| **性能** | 低（阻塞等待） | 中 | 中高 | 高 |
| **业务侵入** | 低（框架处理） | 高（需实现 Try/Confirm/Cancel） | 中（需实现补偿） | 低 |
| **锁粒度** | 数据库行锁（长时间持有） | 业务级资源冻结 | 无锁 | 无锁 |
| **适用场景** | 单体/少量数据库 | 资金交易、高一致性要求 | 长流程、跨多服务 | 异步最终一致 |
| **异常处理** | 回滚简单 | Cancel 需幂等 | 补偿需幂等 | 消息需幂等 |
| **典型框架** | Atomikos、Narayana | Seata TCC | Seata Saga、Temporal | RocketMQ 事务消息 |

---

## 5.4 分布式锁

### 5.4.1 为什么需要分布式锁

在单机环境下，Java 的 `synchronized` 或 `ReentrantLock` 就能解决并发问题。但在分布式系统中，多个 JVM 进程运行在不同机器上，JVM 级别的锁失效了：

```text
  JVM-1 (机器A)              JVM-2 (机器B)
  ┌─────────────┐           ┌─────────────┐
  │ synchronized│           │ synchronized│
  │ 锁对象=本地  │           │ 锁对象=本地  │
  │ ✓ 获得锁    │           │ ✓ 也获得锁  │  ← 两个都拿到了！
  │ 扣减库存     │           │ 扣减库存     │  ← 超卖了！
  └─────────────┘           └─────────────┘
```

### 5.4.2 Redis 实现分布式锁

```java
// 基础版：SET NX EX
public class RedisDistributedLock {

    private final StringRedisTemplate redis;
    private static final String LOCK_PREFIX = "lock:";

    public boolean tryLock(String lockKey, String requestId, long expireSeconds) {
        Boolean result = redis.opsForValue().setIfAbsent(
            LOCK_PREFIX + lockKey,
            requestId,
            Duration.ofSeconds(expireSeconds)
        );
        return Boolean.TRUE.equals(result);
    }

    // 释放锁：必须用 Lua 脚本保证原子性（判断 + 删除）
    public boolean unlock(String lockKey, String requestId) {
        String script = """
            if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('del', KEYS[1])
            else
                return 0
            end
            """;
        Long result = redis.execute(
            new DefaultRedisScript<>(script, Long.class),
            List.of(LOCK_PREFIX + lockKey),
            requestId
        );
        return Long.valueOf(1L).equals(result);
    }
}
```

**为什么用 requestId？** 防止误删别人的锁。线程 A 的锁过期后，线程 B 获得了锁，如果 A 执行完直接 `del`，会把 B 的锁删掉。

### 5.4.3 Redisson 看门狗机制

Redisson 提供了更健壮的分布式锁实现，核心特性是**看门狗（Watchdog）自动续期**：

```java
// Redisson 分布式锁
@Service
public class InventoryService {

    @Autowired
    private RedissonClient redisson;

    public void deductStock(Long productId, int quantity) {
        RLock lock = redisson.getLock("lock:stock:" + productId);

        try {
            // 尝试获取锁，最多等待 10 秒，锁自动过期 30 秒
            // 看门狗会在后台每 10 秒续期一次（默认过期时间的 1/3）
            if (lock.tryLock(10, TimeUnit.SECONDS)) {
                // 业务逻辑
                Stock stock = stockMapper.selectByProductId(productId);
                if (stock.getQuantity() >= quantity) {
                    stockMapper.deduct(productId, quantity);
                } else {
                    throw new BusinessException("库存不足");
                }
            } else {
                throw new BusinessException("获取锁超时");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException("获取锁被中断");
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }
}
```

```text
看门狗续期机制：

  线程 A 获取锁（过期时间 30s）
  │
  ├─ 0s: 获取锁成功
  ├─ 10s: 看门狗续期 → 过期时间重置为 30s
  ├─ 20s: 看门狗续期 → 过期时间重置为 30s
  ├─ 25s: 业务完成，主动释放锁
  │
  └─ 如果线程 A 崩溃 → 没有续期 → 30s 后锁自动过期 → 不会死锁
```

### 5.4.4 ZooKeeper 实现分布式锁

```java
// ZooKeeper 临时顺序节点实现分布式锁
public class ZookeeperDistributedLock {

    private final CuratorFramework client;
    private static final String LOCK_PATH = "/locks";

    public InterProcessMutex getLock(String lockKey) {
        return new InterProcessMutex(client, LOCK_PATH + "/" + lockKey);
    }
}

// 使用
@Service
public class OrderService {

    @Autowired
    private ZookeeperDistributedLock zkLock;

    public void createOrder(OrderRequest request) {
        InterProcessMutex lock = zkLock.getLock("create-order");
        try {
            if (lock.acquire(10, TimeUnit.SECONDS)) {
                // 业务逻辑
                doCreateOrder(request);
            }
        } finally {
            lock.release();
        }
    }
}
```

```text
ZooKeeper 锁原理（临时顺序节点）：

  /locks/create-order/
    ├── _c_000000001  ← 线程A创建（最小，获得锁）
    ├── _c_000000002  ← 线程B创建（监听 001）
    └── _c_000000003  ← 线程C创建（监听 002）

  线程A释放 → 临时节点删除 → 线程B收到通知 → 获得锁
  线程B崩溃 → 临时节点自动删除 → 线程C收到通知 → 获得锁
```

### 5.4.5 分布式锁方案对比

| 维度 | Redis (SET NX) | Redis (Redisson) | ZooKeeper | 数据库唯一索引 |
|------|---------------|-------------------|-----------|--------------|
| **性能** | 极高（内存操作） | 高 | 中（写 ZK 日志） | 低（磁盘 IO） |
| **可靠性** | 中（主从切换可能丢锁） | 高（看门狗续期） | 高（临时节点自动清理） | 中（依赖数据库可用性） |
| **可重入** | 需自行实现 | 内置支持 | 内置支持 | 需自行实现 |
| **公平性** | 非公平 | 可配置公平锁 | 公平（顺序节点） | 非公平 |
| **阻塞等待** | 需自行实现（轮询） | 内置支持 | 内置支持（Watcher） | 需自行实现 |
| **锁超时** | 过期时间 | 看门狗自动续期 | 临时节点随会话 | 需定时清理 |
| **适用场景** | 简单互斥、低一致性 | 通用分布式锁 | 强一致要求 | 简单场景、无额外组件 |
| **额外依赖** | Redis | Redis + Redisson | ZooKeeper | 无 |

### 5.4.6 Redlock：Redis 多节点锁

单个 Redis 实例的主从切换可能导致锁丢失，Redis 作者 Antirez 提出了 Redlock 算法：

```java
// Redisson Redlock 实现
RLock lock1 = redisson1.getLock("lock:resource");
RLock lock2 = redisson2.getLock("lock:resource");
RLock lock3 = redisson3.getLock("lock:resource");

// 在 3 个独立 Redis 实例上获取锁，多数成功才算获得锁
RedissonRedLock redLock = new RedissonRedLock(lock1, lock2, lock3);

try {
    // 最多等待 10 秒，锁自动过期 30 秒
    if (redLock.tryLock(10, 30, TimeUnit.SECONDS)) {
        // 业务逻辑
    }
} finally {
    redLock.unlock();
}
```

> **争议**：Martin Kleppmann 在 2016 年发文《How to do distributed locking》指出 Redlock 存在时钟漂移等问题。实际工程中，如果对一致性要求极高，建议使用 ZooKeeper 或 Etcd；如果可以接受极小概率的锁失效，Redis 方案的性能优势更明显。

---

> **本章小结**：分布式系统的核心问题是"不信任网络"。CAP 告诉你必须做取舍，一致性模型告诉你取舍的粒度，分布式事务和分布式锁是在这些约束下的工程解决方案。没有银弹，只有适合场景的选择。

---

> 分布式理论讲清楚了，但落地时最常遇到的问题是：数据库扛不住流量怎么办？下一章从缓存策略到分库分表，讲大规模数据场景下的完整技术栈。
