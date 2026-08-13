# 高可用设计

> **核心问题**：如何保证系统 99.99% 可用？如何消除单点故障？如何设计故障转移？

---

## 1. 可用性度量

| SLA 等级 | 年停机时间 | 适用场景 |
|---------|-----------|---------|
| 99% (2 个 9) | 3.65 天 | 内部系统 |
| 99.9% (3 个 9) | 8.76 小时 | 一般业务系统 |
| 99.99% (4 个 9) | 52.6 分钟 | 核心业务系统 |
| 99.999% (5 个 9) | 5.26 分钟 | 金融、支付系统 |

## 2. 冗余设计

```java
// 数据库主从架构
// 写入 → 主库
// 读取 → 从库（负载均衡）
@Service\npublic class OrderService {\n    private final OrderRepository masterRepo;   // 写库\n    private final OrderRepository slaveRepo;    // 读库\n    \n    @Transactional  // 写操作走主库\n    public void createOrder(Order order) {\n        masterRepo.save(order);\n    }\n    \n    public Order findById(Long id) {  // 读操作走从库\n        return slaveRepo.findById(id).orElse(null);\n    }\n}\n```

## 3. 故障转移

```java\n// 健康检查 + 自动故障转移\n@Component\npublic class DatabaseHealthChecker {\n    private final DataSource primaryDs;\n    private final DataSource standbyDs;\n    \n    @Scheduled(fixedDelay = 5000)\n    public void checkHealth() {\n        try (Connection conn = primaryDs.getConnection()) {\n            conn.isValid(3);  // 3 秒超时\n        } catch (SQLException e) {\n            // 主库不可用，切换到备库\n            switchToStandby();\n            alertService.sendAlert(\"主库故障，已切换到备库\");\n        }\n    }\n}\n```

## 4. 幂等设计

```java\n// 接口幂等性：同一个请求执行多次，结果一致\n@Service\npublic class PaymentService {\n    \n    public PaymentResult pay(PaymentCommand cmd) {\n        // 1. 检查是否已处理过（幂等键）\n        String idempotentKey = \"payment:\" + cmd.getOrderNo();\n        PaymentRecord existing = paymentRepository.findByOrderNo(cmd.getOrderNo());\n        if (existing != null) {\n            return PaymentResult.success(existing.getTransactionId());\n        }\n        \n        // 2. 执行支付\n        PaymentResult result = doPayment(cmd);\n        \n        // 3. 保存结果\n        paymentRepository.save(new PaymentRecord(cmd.getOrderNo(), result.getTransactionId()));\n        return result;\n    }\n}\n```

## 5. 降级策略

```java\n// 多级降级\n@Service\npublic class ProductService {\n    \n    public ProductVO getProduct(Long id) {\n        try {\n            // 优先：完整数据\n            return getFullProduct(id);\n        } catch (Exception e) {\n            try {\n                // 降级 1：缓存数据\n                return getCachedProduct(id);\n            } catch (Exception e2) {\n                // 降级 2：基础数据\n                return getBasicProduct(id);\n            }\n        }\n    }\n    \n    private ProductVO getFullProduct(Long id) {\n        return productClient.getDetail(id);  // RPC 调用\n    }\n    \n    private ProductVO getCachedProduct(Long id) {\n        return redisTemplate.opsForValue().get(\"product:\" + id);\n    }\n    \n    private ProductVO getBasicProduct(Long id) {\n        ProductVO vo = new ProductVO();\n        vo.setId(id);\n        vo.setName(\"商品信息加载中\");\n        return vo;  // 返回兜底数据\n    }\n}\n```

## 6. 容灾架构

| 架构 | RTO | RPO | 复杂度 | 成本 |
|------|-----|-----|--------|------|
| 冷备 | 小时级 | 小时级 | 低 | 低 |
| 温备 | 分钟级 | 分钟级 | 中 | 中 |
| 热备 | 秒级 | 秒级 | 高 | 高 |
| 多活 | 秒级 | 0 | 极高 | 极高 |

> **核心原则**：高可用不是靠运气，而是靠设计。冗余消除单点故障，幂等保证重试安全，降级保证基本可用，监控保证快速恢复。
