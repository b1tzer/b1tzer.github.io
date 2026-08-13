# SQL 基础与数据类型

## 1. DDL

```sql
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100),
    age INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 2. 数据类型

### 数值
| 类型 | 存储 | 范围 |
|------|------|------|
| TINYINT | 1字节 | -128~127 |
| INT | 4字节 | -21亿~21亿 |
| BIGINT | 8字节 | 极大 |
| DECIMAL(m,d) | 可变 | 精确小数 |

### 字符串
| 类型 | 说明 |
|------|------|
| VARCHAR(n) | 可变长度，最大 65535 |
| CHAR(n) | 固定长度 |
| TEXT | 大文本 |

### 日期时间
| 类型 | 说明 |
|------|------|
| DATETIME | 日期时间，无时区 |
| TIMESTAMP | 时间戳，自动转换时区 |
| DATE | 仅日期 |

---
*待补充：更多 SQL 语法*
