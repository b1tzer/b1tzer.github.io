# GTID 复制

## 1. 什么是 GTID

Global Transaction Identifier，全局事务标识符。
格式：`server_uuid:transaction_id`

## 2. 配置

```ini
# 主库和从库
gtid_mode = ON
enforce_gtid_consistency = ON
```

## 3. 优势

- 自动定位复制位点
- 主从切换简单
- 避免遗漏事务

## 4. 故障切换

```sql
-- 从库提升为主库
STOP SLAVE;
RESET SLAVE ALL;
SET GLOBAL read_only = OFF;
```

---
*待补充：更多 GTID 细节*
