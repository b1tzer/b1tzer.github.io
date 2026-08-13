# LISTEN/NOTIFY

## 1. 用法

```sql
-- 监听端
LISTEN my_channel;

-- 通知端
NOTIFY my_channel, 'Hello World';
```

## 2. 应用场景

- 实时通知
- 缓存失效
- 事件驱动

## 3. 注意事项

- 会话级，连接断开失效
- 消息不持久化
- 适合实时性要求高的场景

---
*待补充：更多 NOTIFY 场景*
