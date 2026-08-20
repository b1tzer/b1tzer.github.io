# 咨询锁

## 1. 用法

```sql
-- 获取锁（会话级）
SELECT pg_advisory_lock(12345);
-- 释放
SELECT pg_advisory_unlock(12345);

-- 获取锁（事务级）
SELECT pg_advisory_xact_lock(12345);

-- 尝试获取（不阻塞）
SELECT pg_try_advisory_lock(12345);  -- 返回 boolean
```

## 2. 应用场景

- 分布式锁
- 防止并发任务执行
- 限流
## 3. 更多咨询锁场景

### 3.1 会话级 vs 事务级咨询锁

```sql
-- 会话级咨询锁：手动释放或连接断开时释放
SELECT pg_advisory_lock(1001);   -- 阻塞等待
SELECT pg_try_advisory_lock(1001);  -- 非阻塞，返回 boolean
SELECT pg_advisory_unlock(1001);    -- 手动释放

-- 事务级咨询锁：事务结束自动释放
BEGIN;
SELECT pg_advisory_xact_lock(1001);   -- 阻塞等待
SELECT pg_advisory_xact_lock(1001);   -- 非阻塞
-- 事务结束自动释放
COMMIT;

-- 双参数版本（用两个整数组成锁标识）
SELECT pg_advisory_lock(100, 200);  -- 锁标识 = (100, 200)
SELECT pg_advisory_unlock(100, 200);
```

### 3.2 防止重复处理

```sql
-- 场景：多个 worker 并发处理任务，防止同一任务被重复处理
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    payload JSONB,
    status TEXT DEFAULT 'pending'
);

-- 获取任务并锁定
BEGIN;
SELECT * FROM tasks
WHERE status = 'pending'
  AND pg_try_advisory_xact_lock(id)  -- 用任务 ID 作为锁标识
ORDER BY created_at
LIMIT 1 FOR UPDATE SKIP LOCKED;
-- 处理任务...
UPDATE tasks SET status = 'done' WHERE id = ?;
COMMIT;
```

### 3.3 分布式任务调度

```sql
-- 场景：多实例部署的定时任务，只有一个实例执行
-- 用任务类型 ID 作为锁标识
CREATE OR REPLACE FUNCTION try_acquire_job(job_id INT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN pg_try_advisory_lock(job_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_job(job_id INT)
RETURNS VOID AS $$
BEGIN
    PERFORM pg_advisory_unlock(job_id);
END;
$$ LANGUAGE plpgsql;

-- 使用方式
SELECT try_acquire_job(1001);  -- 获取锁
-- 执行任务...
SELECT release_job(1001);     -- 释放锁
```

### 3.4 数据库级别的全局锁

```sql
-- 场景：防止同时执行数据库迁移
SELECT pg_try_advisory_lock(999999);
-- 返回 true 表示获取成功，可以执行迁移
-- 返回 false 表示其他连接正在迁移

-- 迁移完成后释放
SELECT pg_advisory_unlock(999999);
```

### 3.5 监控咨询锁

```sql
-- 查看当前持有的咨询锁
SELECT * FROM pg_locks WHERE locktype = 'advisory';

-- 查看咨询锁等待
SELECT
    blocked.pid,
    blocked.query,
    blocking.pid AS blocking_pid,
    blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_locks bl ON bl.pid = blocked.pid AND bl.locktype = 'advisory' AND NOT bl.granted
JOIN pg_locks kl ON kl.locktype = 'advisory' AND kl.classid = bl.classid AND kl.objid = bl.objid AND kl.granted
JOIN pg_stat_activity blocking ON blocking.pid = kl.pid;
```

### 3.6 咨询锁 vs 行锁 vs Redis 分布式锁

| 对比项 | 咨询锁 | 行锁（SELECT FOR UPDATE） | Redis 分布式锁 |
|--------|--------|--------------------------|----------------|
| 锁定对象 | 整数 ID（应用定义语义） | 数据库行 | Redis key |
| 释放时机 | 手动/事务结束/连接断开 | 事务结束 | 设置过期时间 |
| 阻塞方式 | pg_advisory_lock 阻塞 | FOR UPDATE 阻塞 | 自旋等待 |
| 适用范围 | 单数据库 | 单数据库 | 跨数据库/跨服务 |
| 依赖组件 | 无 | 无 | 需要 Redis |
| 性能 | 极高（内存操作） | 高 | 高（网络往返） |

> **选择建议**：单数据库场景优先用咨询锁，简单高效；跨服务场景用 Redis 分布式锁；行锁用于保护数据行一致性。
