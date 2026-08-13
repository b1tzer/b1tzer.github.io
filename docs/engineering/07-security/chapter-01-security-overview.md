# 安全概览

## 1. OWASP Top 10

| 排名 | 风险 | 说明 |
|------|------|------|
| A01 | 访问控制失效 | 未授权访问 |
| A02 | 加密失败 | 敏感数据泄露 |
| A03 | 注入 | SQL/NoSQL/命令注入 |
| A04 | 不安全设计 | 设计缺陷 |
| A05 | 安全配置错误 | 默认配置、错误信息泄露 |
| A06 | 脆弱过时组件 | 使用有漏洞的依赖 |
| A07 | 认证失败 | 弱密码、会话管理 |
| A08 | 软件和数据完整性失败 | 未验证更新、CI/CD漏洞 |
| A09 | 安全日志和监控失败 | 缺少审计日志 |
| A10 | SSRF | 服务端请求伪造 |

## 2. 安全原则

- 最小权限原则
- 纵深防御
- 安全默认
- 失败安全

## 3. 安全开发生命周期

```
需求 → 设计 → 编码 → 测试 → 部署 → 运维
 ↑       ↑      ↑      ↑      ↑      ↑
威胁建模 安全设计 安全编码 安全测试 安全配置 监控响应
```

## 4. OWASP Top 10 详解与代码示例

### 4.1 注入（A03）

```java
// 差：SQL 注入
String sql = "SELECT * FROM users WHERE name = '" + username + "'";
Statement stmt = connection.createStatement();
ResultSet rs = stmt.executeQuery(sql);  // username = "' OR '1'='1" 可注入

// 好：参数化查询
String sql = "SELECT * FROM users WHERE name = ?";
PreparedStatement ps = connection.prepareStatement(sql);
ps.setString(1, username);
ResultSet rs = ps.executeQuery();  // 参数化，不会被注入

// 更好：使用 JPA/MyBatis
@Query("SELECT u FROM User u WHERE u.name = :name")
User findByName(@Param("name") String name);
```

### 4.2 加密失败（A02）

```java
// 差：明文存储密码
user.setPassword(password);  // 数据库泄露 = 密码泄露

// 好：使用 BCrypt 加密
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
String hashed = encoder.encode(password);  // 存储加密后的密码
boolean matches = encoder.matches(rawPassword, hashed);  // 验证密码
```

### 4.3 安全配置错误（A05）

```java
// 差：暴露详细错误信息
catch (Exception e) {
    return "错误: " + e.getMessage() + "\n" + e.getStackTrace();  // 泄露内部实现
}

// 好：返回通用错误信息
catch (Exception e) {
    log.error("操作失败", e);  // 详细日志记录
    return "系统繁忙，请稍后重试";  // 通用错误信息
}
```

## 5. 安全开发 Checklist

```markdown
□ 所有用户输入都经过校验和清洗
□ SQL 查询使用参数化/预编译
□ 密码使用 BCrypt/SCrypt 加密存储
□ 敏感数据传输使用 HTTPS
□ API 接口有认证和授权
□ 日志不记录敏感信息（密码、token）
□ 依赖库定期更新，修复已知漏洞
□ 错误信息不泄露内部实现细节
□ 文件上传有类型和大小限制
□ CSRF Token 已启用
```

> **安全的核心理念**：安全不是功能，而是属性。它不是做完一次就结束的，而是需要在开发的每个阶段持续关注的。
