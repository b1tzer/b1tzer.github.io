# 乐观锁

## 1. 实现方式

### 版本号机制
```sql
-- 表结构
ALTER TABLE products ADD COLUMN version INT DEFAULT 0;

-- 更新
UPDATE products 
SET stock = stock - 1, version = version + 1 
WHERE id = 1 AND version = 5;

-- 检查影响行数，0 表示冲突
```

### 时间戳机制
```sql
UPDATE products 
SET stock = stock - 1, updated_at = NOW() 
WHERE id = 1 AND updated_at = '2024-01-01 12:00:00';
```

## 2. 适用场景

- 读多写少
- 冲突概率低
- 不需要阻塞等待

## 3. 与悲观锁对比

| 特性 | 乐观锁 | 悲观锁 |
|------|--------|--------|
| 实现 | 版本号/时间戳 | SELECT FOR UPDATE |
| 冲突处理 | 重试 | 阻塞等待 |
| 适用场景 | 读多写少 | 写多冲突多 |

---
*待补充：更多乐观锁场景*
