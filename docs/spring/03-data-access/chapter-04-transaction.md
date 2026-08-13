# 事务管理

## 1. @Transactional

```java
@Service
public class UserService {
    @Transactional(rollbackFor = Exception.class)
    public void transfer(Long fromId, Long toId, BigDecimal amount) {
        accountService.debit(fromId, amount);
        accountService.credit(toId, amount);
    }
}
```

## 2. 传播行为

| 传播行为 | 说明 |
|---------|------|
| REQUIRED | 默认，有则加入，无则新建 |
| REQUIRES_NEW | 总是新建，挂起当前 |
| NESTED | 嵌套事务，有则新建保存点 |
| SUPPORTS | 有则加入，无则非事务 |
| NOT_SUPPORTED | 非事务执行，挂起当前 |
| MANDATORY | 必须有事务，否则抛异常 |
| NEVER | 必须无事务，否则抛异常 |

## 3. 隔离级别

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
|---------|------|-----------|------|
| READ_UNCOMMITTED | ✓ | ✓ | ✓ |
| READ_COMMITTED | ✗ | ✓ | ✓ |
| REPEATABLE_READ | ✗ | ✗ | ✓ |
| SERIALIZABLE | ✗ | ✗ | ✗ |

## 4. @Transactional 失效场景

1. 方法非 public
2. 自调用（this.method()）
3. 异常被 catch
4. 抛出非 RuntimeException（需指定 rollbackFor）

## 5. 事务实战

### 5.1 声明式事务详解

```java
@Service
@Slf4j
public class OrderService {

    // 基本用法：所有 RuntimeException 回滚
    @Transactional
    public Order createOrder(OrderRequest request) {
        // 1. 扣减库存
        productService.deductStock(request.getProductId(), request.getQuantity());
        // 2. 创建订单
        Order order = orderRepository.save(new Order(request));
        // 3. 扣减余额
        accountService.debit(request.getUserId(), order.getTotalAmount());
        return order;
        // 任何一步抛异常，全部回滚
    }

    // 指定回滚异常
    @Transactional(rollbackFor = Exception.class)  // 所有异常都回滚
    public void processRefund(Long orderId) throws BusinessException {
        // ...
    }

    // 只读事务（优化提示）
    @Transactional(readOnly = true)
    public Order getOrder(Long id) {
        return orderRepository.findById(id).orElseThrow();
    }

    // 指定超时
    @Transactional(timeout = 30)  // 30 秒超时
    public void batchProcess(List<Long> orderIds) {
        // 批量处理
    }
}
```

### 5.2 传播行为实战

```java
@Service
public class PaymentService {

    // REQUIRED（默认）：加入当前事务
    @Transactional(propagation = Propagation.REQUIRED)
    public void processPayment(Long orderId, BigDecimal amount) {
        // 如果外层有事务，加入；没有则新建
    }

    // REQUIRES_NEW：独立事务
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveAuditLog(AuditLog log) {
        // 无论外层事务是否回滚，审计日志都独立提交
    }
}

@Service
public class OrderService {

    @Autowired
    private PaymentService paymentService;
    @Autowired
    private AuditLogService auditLogService;

    @Transactional
    public void createOrder(OrderRequest request) {
        try {
            orderRepository.save(new Order(request));
            paymentService.processPayment(request.getId(), request.getAmount());
        } catch (Exception e) {
            // 审计日志用 REQUIRES_NEW，即使订单创建失败也会记录
            auditLogService.saveAuditLog(new AuditLog("ORDER_CREATE_FAILED", e.getMessage()));
            throw e;
        }
    }
}
```

### 5.3 编程式事务

```java
@Service
public class BatchService {

    @Autowired
    private TransactionTemplate transactionTemplate;

    public void batchProcess(List<Long> ids) {
        // 编程式事务：更精细的控制
        transactionTemplate.executeWithoutResult(status -> {
            try {
                for (Long id : ids) {
                    processSingle(id);
                }
            } catch (Exception e) {
                status.setRollbackOnly();  // 手动标记回滚
                throw e;
            }
        });
    }

    // 带返回值
    public int processWithResult(Long id) {
        return transactionTemplate.execute(status -> {
            try {
                return doProcess(id);
            } catch (Exception e) {
                status.setRollbackOnly();
                throw e;
            }
        });
    }
}
```

### 5.4 @Transactional 失效场景详解

```java
// 场景一：方法非 public
@Service
public class UserService {
    @Transactional  // ❌ 不生效，CGLIB 只能代理 public 方法
    void internalMethod() { /* ... */ }
}

// 场景二：自调用
@Service
public class OrderService {
    public void createOrder() {
        this.processPayment();  // ❌ 不走代理，事务不生效
    }

    @Transactional
    public void processPayment() { /* ... */ }
}

// 解决自调用
@Service
public class OrderService {
    @Autowired
    private ApplicationContext context;

    public void createOrder() {
        // ✅ 通过代理对象调用
        context.getBean(OrderService.class).processPayment();
    }

    @Transactional
    public void processPayment() { /* ... */ }
}

// 场景三：异常被吞
@Service
public class UserService {
    @Transactional
    public void updateUser(Long id) {
        try {
            doUpdate(id);
        } catch (Exception e) {
            log.error("更新失败", e);  // ❌ 异常被 catch，Spring 无法感知回滚
        }
    }
}

// 场景四：非 RuntimeException 未指定 rollbackFor
@Service
public class UserService {
    @Transactional  // ❌ 默认只回滚 RuntimeException
    public void updateUser(Long id) throws BusinessException {
        throw new BusinessException("业务异常");  // 不会回滚！
    }

    @Transactional(rollbackFor = Exception.class)  // ✅ 指定回滚所有异常
    public void updateUserSafe(Long id) throws BusinessException {
        throw new BusinessException("业务异常");  // 会回滚
    }
}
```

**最佳实践：**

1. **始终指定 `rollbackFor = Exception.class`**——避免非 RuntimeException 不回滚的坑
2. **事务方法尽量短小**——长事务占用数据库连接，影响并发性能
3. **只读查询加 `readOnly = true`**——Hibernate 会跳过脏检查，提升性能
4. **避免在事务中调用外部 API**——网络超时会导致事务长时间持有连接
5. **`REQUIRES_NEW` 谨慎使用**——会挂起当前事务，可能导致死锁
