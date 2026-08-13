# DevTools 热部署

## 1. 原理

DevTools 使用双 ClassLoader：
- Base ClassLoader：加载第三方 jar
- Restart ClassLoader：加载项目代码

代码变化时只重启 Restart ClassLoader，速度极快。

## 2. 配置

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <optional>true</optional>
</dependency>
```

## 3. LiveReload

DevTools 内置 LiveReload 服务器，浏览器安装插件后自动刷新。

---
*待补充：远程调试配置*
