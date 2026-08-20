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
## 4. 更多 NOTIFY 场景

### 4.1 基本用法详解

```sql
-- 监听端（会话1）
LISTEN order_channel;

-- 检查通知（在应用层轮询）
SELECT * FROM pg_notification;  -- PG 14+ 不支持此视图
-- 应用层通过 libpq 的 PQnotifies() 获取通知

-- 通知端（会话2）
NOTIFY order_channel, '{"order_id": 12345, "status": "shipped"}';

-- 带 payload 的通知（PG 9.0+）
NOTIFY order_channel, 'order_created:12345';
```

### 4.2 触发器 + NOTIFY 实现实时通知

```sql
-- 当订单状态变化时通知应用
CREATE OR REPLACE FUNCTION notify_order_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('order_changes', json_build_object(
        'operation', TG_OP,
        'order_id', NEW.id,
        'status', NEW.status,
        'user_id', NEW.user_id
    )::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_notify
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_order_change();

-- 应用层监听 order_changes 通道
-- 收到通知后更新缓存或推送 WebSocket
```

### 4.3 缓存失效

```sql
-- 当数据变化时通知应用层清除缓存
CREATE OR REPLACE FUNCTION notify_cache_invalidation()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('cache_invalidate',
        TG_TABLE_NAME || ':' || COALESCE(NEW.id::text, OLD.id::text));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_cache
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION notify_cache_invalidation();

CREATE TRIGGER trg_products_cache
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION notify_cache_invalidation();
```

### 4.4 Spring Boot 集成

```java
@Component
public class PgNotificationListener implements ApplicationListener<ApplicationReadyEvent> {

    @Autowired
    private DataSource dataSource;

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        new Thread(() -> {
            try (Connection conn = dataSource.getConnection()) {
                PGConnection pgConn = conn.unwrap(PGConnection.class);
                Statement stmt = conn.createStatement();
                stmt.execute("LISTEN order_changes");
                stmt.close();

                while (true) {
                    pgConn.getNotifications(30000);  // 等待30秒
                    for (PGNotification notification : pgConn.getNotifications()) {
                        // 处理通知
                        handleMessage(notification.getParameter());
                    }
                }
            } catch (SQLException e) {
                log.error("Notification listener error", e);
            }
        }).start();
    }
}
```

### 4.5 NOTIFY 的限制与替代方案

| 限制 | 说明 | 替代方案 |
|------|------|----------|
| 会话级 | 连接断开后失效 | 使用消息队列（RabbitMQ/Kafka） |
| 不持久化 | 如果没有监听者，通知丢失 | 使用 pgq 或消息队列 |
| 8000 字节限制 | payload 最大 8000 字节 | 只发送通知，不发送数据 |
| 不可靠 | 可能丢失通知 | 重要消息使用消息队列 |

> **适用场景**：LISTEN/NOTIFY 适合简单的实时通知（缓存失效、UI 更新），不适合可靠的消息传递。对于重要业务消息，使用消息队列中间件。
