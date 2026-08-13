# 分片

## 1. Citus

```sql
CREATE EXTENSION citus;
-- 创建分布式表
SELECT create_distributed_table('orders', 'user_id');
```

## 2. 应用层分片

```java
// 根据 user_id 路由到不同数据源
String shard = "pg_" + (userId % 4);
```

## 3. 分片策略

| 策略 | 说明 | 适用场景 |
|------|------|---------|
| 范围分片 | 按ID/时间范围 | 时序数据 |
| 哈希分片 | 按hash值 | 均匀分布 |
| 列表分片 | 按枚举值 | 多租户 |

---
## 4. 更多分片场景

### 4.1 Citus 详解

```sql
-- 安装 Citus
CREATE EXTENSION citus;

-- 添加工作节点
SELECT citus_add_node('192.168.1.102', 5432);
SELECT citus_add_node('192.168.1.103', 5432);

-- 创建分布式表
SELECT create_distributed_table('orders', 'user_id');

-- 创建参考表（小表，复制到所有节点）
SELECT create_reference_table('products');

-- 查询自动路由到对应节点
SELECT * FROM orders WHERE user_id = 123;  -- 只查询一个节点

-- 跨节点聚合
SELECT user_id, SUM(amount) FROM orders GROUP BY user_id;

-- 查看分片信息
SELECT * FROM pg_dist_shard;
SELECT * FROM pg_dist_placement;
```

### 4.2 应用层分片详解

```java
// 基于 user_id 的哈希分片
@Configuration
public class ShardingConfig {

    @Bean
    public DataSource shardingDataSource() {
        Map<Object, DataSource> targetDataSources = new HashMap<>();
        targetDataSources.put(0, createDataSource("pg_shard_0"));
        targetDataSources.put(1, createDataSource("pg_shard_1"));
        targetDataSources.put(2, createDataSource("pg_shard_2"));
        targetDataSources.put(3, createDataSource("pg_shard_3"));

        AbstractRoutingDataSource routingDataSource = new UserShardingDataSource();
        routingDataSource.setTargetDataSources(targetDataSources);
        routingDataSource.setDefaultTargetDataSource(targetDataSources.get(0));
        return routingDataSource;
    }
}

// 路由逻辑
public class UserShardingDataSource extends AbstractRoutingDataSource {
    @Override
    protected Object determineCurrentLookupKey() {
        Long userId = UserContext.getCurrentUserId();
        return (int)(userId % 4);
    }
}
```

### 4.3 分片键选择

| 分片键 | 优势 | 劣势 | 适用场景 |
|--------|------|------|----------|
| user_id | 大多数查询单节点完成 | 跨用户查询需要广播 | C端应用 |
| order_id | 均匀分布 | 查询需要广播 | 订单系统 |
| 时间范围 | 按时间查询高效 | 热点写入 | 日志/时序数据 |
| 地区 | 按地区查询高效 | 跨地区查询复杂 | 多租户 |

### 4.4 跨分片查询

```sql
-- Citus 自动处理跨分片查询
SELECT u.name, SUM(o.amount)
FROM users u JOIN orders o ON u.id = o.user_id
GROUP BY u.name;

-- 应用层跨分片查询（需要聚合）
-- 1. 并行查询所有分片
-- 2. 合并结果
-- 3. 排序/分页
```

### 4.5 分片扩容

```sql
-- Citus 在线扩容
SELECT citus_add_node('192.168.1.104', 5432);
SELECT rebalance_table_shards();

-- 应用层扩容（需要数据迁移）
-- 1. 创建新的分片
-- 2. 迁移数据（使用 pg_dump/restore 或逻辑复制）
-- 3. 切换路由规则
```

### 4.6 分片最佳实践

| 实践 | 说明 |
|------|------|
| 选择合适的分片键 | 高频查询条件，均匀分布 |
| 避免跨分片事务 | 尽量让相关数据在同一分片 |
| 参考表复制 | 小表（如配置表）复制到所有节点 |
| 监控分片均衡 | 定期检查各分片数据量和负载 |
| 预估分片数量 | 建议分片数 = 预期节点数的 2-4 倍 |
