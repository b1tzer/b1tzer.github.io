# 定时任务

## 1. @Scheduled

```java
@Configuration
@EnableScheduling
public class ScheduleConfig {
    // 固定频率
    @Scheduled(fixedRate = 5000)
    public void reportCurrentTime() { /* ... */ }
    
    // 固定延迟
    @Scheduled(fixedDelay = 5000)
    public void processTask() { /* ... */ }
    
    // Cron 表达式
    @Scheduled(cron = "0 0 2 * * ?")
    public void dailyCleanup() { /* ... */ }
}
```

## 2. 动态定时任务

```java
@Service
public class DynamicScheduler {
    @Autowired
    private TaskScheduler taskScheduler;
    
    public void addTask(String taskId, Runnable task, String cron) {
        taskScheduler.schedule(task, new CronTrigger(cron));
    }
}
```

## 3. 定时任务高级用法

### 3.1 多实例环境下的任务去重

```java
// 使用分布式锁保证同一任务只在一个实例上执行
@Scheduled(fixedRate = 60000)
public void scheduledTask() {
    String lockKey = "task:daily-report";
    boolean locked = distributedLock.tryLock(lockKey, 5, TimeUnit.MINUTES);
    if (!locked) {
        log.debug("任务已被其他实例执行，跳过");
        return;
    }
    try {
        doDailyReport();
    } finally {
        distributedLock.unlock(lockKey);
    }
}
```

### 3.2 动态定时任务（数据库驱动）

```java
@Service
public class DynamicScheduleService {

    @Autowired
    private TaskScheduler taskScheduler;

    // 存储已注册的定时任务
    private final Map<String, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();

    // 从数据库加载并注册定时任务
    @PostConstruct
    public void initTasks() {
        List<ScheduleConfig> configs = scheduleConfigRepository.findAllEnabled();
        for (ScheduleConfig config : configs) {
            addTask(config);
        }
    }

    public void addTask(ScheduleConfig config) {
        ScheduledFuture<?> future = taskScheduler.schedule(
            () -> executeTask(config),
            new CronTrigger(config.getCron())
        );
        scheduledTasks.put(config.getTaskId(), future);
    }

    public void removeTask(String taskId) {
        ScheduledFuture<?> future = scheduledTasks.remove(taskId);
        if (future != null) {
            future.cancel(false);
        }
    }

    // 运行时修改 cron 表达式
    public void updateCron(String taskId, String newCron) {
        removeTask(taskId);
        ScheduleConfig config = scheduleConfigRepository.findByTaskId(taskId);
        config.setCron(newCron);
        scheduleConfigRepository.save(config);
        addTask(config);
    }

    private void executeTask(ScheduleConfig config) {
        log.info("执行定时任务: {}", config.getTaskName());
        // 记录执行日志
        ScheduleLog log = new ScheduleLog(config.getTaskId(), LocalDateTime.now());
        try {
            // 动态执行（根据任务类型调用不同的处理器）
            TaskHandler handler = taskHandlerMap.get(config.getHandlerType());
            handler.handle(config.getParams());
            log.setStatus("SUCCESS");
        } catch (Exception e) {
            log.setStatus("FAILED");
            log.setError(e.getMessage());
        } finally {
            log.setFinishedAt(LocalDateTime.now());
            scheduleLogRepository.save(log);
        }
    }
}
```

### 3.3 异步定时任务

```java
@Configuration
@EnableScheduling
public class ScheduleConfig {

    // 自定义定时任务线程池
    @Bean
    public TaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(10);
        scheduler.setThreadNamePrefix("scheduled-");
        scheduler.setErrorHandler(t ->
            log.error("定时任务异常", t));
        return scheduler;
    }
}
```

### 3.4 Spring Task vs Quartz 对比

| 特性 | @Scheduled | Quartz |
|------|-----------|--------|
| 配置方式 | 注解 | 编程 + 数据库 |
| 动态调度 | 需自行实现 | ✅ 内置 |
| 集群支持 | 需自行实现分布式锁 | ✅ 内置集群模式 |
| 任务持久化 | ❌ | ✅ 存储到数据库 |
| 错过执行策略 | 不支持 | misfire 指令 |
| 适用场景 | 简单定时任务 | 复杂调度需求 |

**最佳实践：**

1. **分布式环境必须做任务去重**——Redis 分布式锁或数据库乐观锁
2. **定时任务线程池与业务线程池分离**——避免定时任务占满业务线程
3. **记录任务执行日志**——方便排查任务失败原因
4. **避免任务执行时间超过调度间隔**——否则会导致任务堆积
5. **复杂调度场景用 Quartz**——支持 cron、间隔、日历等多种触发器
