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

---
*待补充：更多 AOP 实战场景*
