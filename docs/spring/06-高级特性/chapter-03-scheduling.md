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

---
*待补充：更多调度场景*
