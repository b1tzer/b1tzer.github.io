# Undo Log

## 1. 作用

- 事务回滚
- MVCC 多版本并发控制

## 2. 类型

| 类型 | 说明 |
|------|------|
| insert undo | INSERT 产生，事务结束直接删除 |
| update undo | UPDATE/DELETE 产生，purge 线程清理 |

## 3. MVCC 实现

```
记录隐藏列：
- DB_TRX_ID: 最后修改的事务ID
- DB_ROLL_PTR: 指向 Undo Log 的指针

版本链：
当前记录 → Undo Log v3 → Undo Log v2 → Undo Log v1
```

## 4. Read View

```sql
-- 读已提交：每次 SELECT 创建新的 Read View
-- 可重复读：事务第一次 SELECT 创建 Read View，后续复用
```

Read View 包含：
- m_ids: 活跃事务ID列表
- min_trx_id: 最小活跃事务ID
- max_trx_id: 下一个分配的事务ID
- creator_trx_id: 创建者事务ID

---
*待补充：更多 MVCC 细节*
