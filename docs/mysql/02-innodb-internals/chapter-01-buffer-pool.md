# Buffer Pool

## 1. 作用

Buffer Pool 是 InnoDB 最重要的内存结构，用于缓存数据页和索引页。

## 2. LRU 算法

```
┌─────────────────────┐
│   Young 区 (5/8)     │  热数据，最近访问
├─────────────────────┤
│   Old 区 (3/8)       │  冷数据，新读入的页
└─────────────────────┘

新页 → Old 区头部 → 超过 1s 再访问 → 移到 Young 区
```

## 3. 核心参数

```ini
innodb_buffer_pool_size = 4G          # 建议物理内存的 70%
innodb_buffer_pool_instances = 8      # 多实例减少锁竞争
innodb_old_blocks_pct = 37            # Old 区比例
innodb_old_blocks_time = 1000         # 移到 Young 区的等待时间(ms)
```

## 4. 监控

```sql
SHOW ENGINE INNODB STATUS;

-- Buffer Pool 命中率
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_read%';
-- 命中率 = 1 - Innodb_buffer_pool_reads / Innodb_buffer_pool_read_requests
```

---
*待补充：Change Buffer、AHI*
