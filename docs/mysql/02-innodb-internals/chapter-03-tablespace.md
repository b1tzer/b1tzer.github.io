# 表空间

## 1. 类型

| 表空间 | 文件 | 说明 |
|--------|------|------|
| 系统表空间 | ibdata1 | 数据字典、Undo Log、Change Buffer |
| 独立表空间 | .ibd | 每个表一个文件 |
| 通用表空间 | 自定义 | 用户创建的共享表空间 |
| 临时表空间 | ibtmp1 | 临时表 |
| Undo 表空间 | undo_001/002 | Undo Log 存储 |

## 2. 配置

```ini
# 独立表空间（默认开启）
innodb_file_per_table = 1

# 系统表空间大小
innodb_data_file_path = ibdata1:1G:autoextend
```

## 3. 段、区、页

```
表空间
├── 段 (Segment)
│   ├── 数据段（叶子节点）
│   └── 索引段（非叶子节点）
│       └── 区 (Extent) = 1MB = 64个页
│           └── 页 (Page) = 16KB
```

---
*待补充：更多表空间管理*
