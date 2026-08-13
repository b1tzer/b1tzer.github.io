# 窗口函数

## 1. 基本语法

```sql
SELECT 
    name,
    department,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk,
    DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dense_rnk
FROM employees;
```

## 2. 常用窗口函数

| 函数 | 说明 |
|------|------|
| ROW_NUMBER() | 行号，无重复 |
| RANK() | 排名，有重复会跳号 |
| DENSE_RANK() | 排名，有重复不跳号 |
| LAG(col, n) | 前 n 行的值 |
| LEAD(col, n) | 后 n 行的值 |
| FIRST_VALUE() | 窗口内第一行 |
| LAST_VALUE() | 窗口内最后一行 |

## 3. 聚合窗口函数

```sql
SELECT 
    name,
    salary,
    department,
    SUM(salary) OVER (PARTITION BY department) AS dept_total,
    AVG(salary) OVER (PARTITION BY department) AS dept_avg
FROM employees;
```

---
*待补充：更多窗口函数场景*
