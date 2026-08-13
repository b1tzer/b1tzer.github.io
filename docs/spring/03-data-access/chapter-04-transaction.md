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

---
*待补充：更多事务实战*
