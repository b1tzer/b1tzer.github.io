# AOP 面向切面编程

## 1. 核心概念

| 概念 | 说明 |
|------|------|
| Aspect | 切面，横切关注点的模块化 |
| JoinPoint | 连接点，程序执行的某个点 |
| Advice | 通知，在连接点执行的动作 |
| Pointcut | 切点，匹配连接点的表达式 |
| Weaving | 织入，将切面应用到目标对象 |

## 2. 通知类型

```java
@Aspect
@Component
public class LogAspect {
    @Before("execution(* com.example.service.*.*(..))")
    public void before(JoinPoint jp) { /* 前置通知 */ }
    
    @AfterReturning(pointcut = "execution(* com.example.service.*.*(..))", returning = "result")
    public void afterReturning(Object result) { /* 返回通知 */ }
    
    @AfterThrowing(pointcut = "execution(* com.example.service.*.*(..))", throwing = "ex")
    public void afterThrowing(Exception ex) { /* 异常通知 */ }
    
    @After("execution(* com.example.service.*.*(..))")
    public void after() { /* 后置通知 */ }
    
    @Around("execution(* com.example.service.*.*(..))")
    public Object around(ProceedingJoinPoint pjp) throws Throwable {
        return pjp.proceed(); // 环绕通知
    }
}
```

## 3. JDK Proxy vs CGLIB

| 特性 | JDK Proxy | CGLIB |
|------|-----------|-------|
| 条件 | 实现接口 | 无要求 |
| 原理 | 反射 | 字节码增强 |
| 性能 | 较慢 | 较快 |
| 限制 | 只能代理接口 | 不能代理 final 类 |

## 4. @EnableAspectJAutoProxy 原理

```java
@Import(AspectJAutoProxyRegistrar.class)
public @interface EnableAspectJAutoProxy {
    boolean proxyTargetClass() default false; // true 强制 CGLIB
}
```

## 5. AOP 实战场景

### 5.1 方法执行耗时统计

```java
@Aspect
@Component
public class PerformanceAspect {

    private static final Logger log = LoggerFactory.getLogger(PerformanceAspect.class);

    @Around("@annotation(monitored)")
    public Object monitor(ProceedingJoinPoint pjp, Monitored monitored) throws Throwable {
        long start = System.currentTimeMillis();
        try {
            Object result = pjp.proceed();
            long elapsed = System.currentTimeMillis() - start;
            log.info("方法 {} 执行耗时: {}ms", pjp.getSignature().toShortString(), elapsed);
            if (elapsed > monitored.threshold()) {
                log.warn("方法 {} 耗时超过阈值 {}ms", pjp.getSignature().toShortString(), monitored.threshold());
            }
            return result;
        } catch (Throwable t) {
            log.error("方法 {} 执行异常", pjp.getSignature().toShortString(), t);
            throw t;
        }
    }
}

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Monitored {
    long threshold() default 1000;  // 默认阈值 1 秒
}
```

### 5.2 操作日志记录（AOP + SpEL）

```java
@Aspect
@Component
public class OperationLogAspect {

    @Autowired
    private OperationLogService logService;

    @Around("@annotation(opLog)")
    public Object logOperation(ProceedingJoinPoint pjp, OperationLog opLog) throws Throwable {
        // 解析 SpEL 表达式获取业务描述
        String description = parseExpression(opLog.description(), pjp.getArgs());

        Object result = null;
        boolean success = true;
        try {
            result = pjp.proceed();
            return result;
        } catch (Throwable t) {
            success = false;
            throw t;
        } finally {
            logService.save(OperationLogEntity.builder()
                .module(opLog.module())
                .operation(opLog.operation())
                .description(description)
                .success(success)
                .operator(getCurrentUser())
                .createdAt(LocalDateTime.now())
                .build());
        }
    }

    private String parseExpression(String expression, Object[] args) {
        // 简化的 SpEL 解析
        SpelExpressionParser parser = new SpelExpressionParser();
        StandardEvaluationContext context = new StandardEvaluationContext();
        // 将方法参数绑定到 SpEL 上下文
        context.setVariable("args", args);
        return parser.parseExpression(expression).getValue(context, String.class);
    }
}

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface OperationLog {
    String module();
    String operation();
    String description() default "";
}
```

### 5.3 本地缓存 AOP 封装

```java
@Aspect
@Component
public class LocalCacheAspect {

    private final Cache<String, Object> cache = CacheBuilder.newBuilder()
        .maximumSize(1000)
        .expireAfterWrite(5, TimeUnit.MINUTES)
        .build();

    @Around("@annotation(cacheable)")
    public Object cache(ProceedingJoinPoint pjp, LocalCache cacheable) throws Throwable {
        // 构建缓存 key：类名 + 方法名 + 参数
        String key = buildKey(pjp);

        // 尝试从缓存获取
        Object cached = cache.getIfPresent(key);
        if (cached != null) {
            return cached;
        }

        // 执行原方法
        Object result = pjp.proceed();

        // 写入缓存
        cache.put(key, result);
        return result;
    }

    private String buildKey(ProceedingJoinPoint pjp) {
        return pjp.getTarget().getClass().getSimpleName()
            + ":" + pjp.getSignature().getName()
            + ":" + Arrays.deepHashCode(pjp.getArgs());
    }
}

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface LocalCache {
}
```

### 5.4 AOP 代理失效的常见原因

| 原因 | 说明 | 解决方案 |
|------|------|----------|
| 自调用 | `this.method()` 不走代理 | 注入自身代理或使用 `AopContext.currentProxy()` |
| private 方法 | CGLIB 无法代理 private 方法 | 改为 package-private 或 protected |
| final 类/方法 | CGLIB 无法继承 final 类 | 去掉 final 修饰符 |
| 未被 Spring 管理 | 手动 `new` 的对象没有代理 | 通过容器获取 Bean |

```java
// 自调用问题示例与解决
@Service
public class OrderService {

    public void processOrder() {
        // ❌ 错误：自调用，不会走 AOP 代理
        // this.validateOrder();

        // ✅ 正确：通过代理对象调用
        ((OrderService) AopContext.currentProxy()).validateOrder();
    }

    @Transactional
    public void validateOrder() {
        // 这里的事务注解需要代理才能生效
    }
}
```
