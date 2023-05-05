# The Stack

> 🎯 一份深度技术解析与实战沉淀的知识库

## 📖 项目简介

The Stack 是一个综合性的技术知识库，旨在为开发者提供全面、深入的技术解析和实战经验。我们致力于通过系统化的知识体系，帮助开发者快速掌握核心技术栈，提升技术能力。[部署站点](https://thestack.xpro.wang)

### 项目目的

- **知识系统化**：将分散的技术知识点整合成完整的知识体系
- **深度解析**：深入剖析技术原理和实现细节
- **实战指导**：提供实际项目中的最佳实践和解决方案
- **持续更新**：跟进技术发展，不断补充新内容

## 🛠️ 技术栈

本项目涉及的核心技术领域包括：

| 技术领域 | 内容 |
|---------|------|
| **[环境搭建](docs/00-Env/)** <!-- dir:00-Env --> | WSL 环境配置、命令行工具优化、开发环境搭建 |
| **[Java 基础](docs/01-java-basic/)** <!-- dir:01-java-basic --> | Java 8+ 新特性、并发编程、JVM 原理、集合框架 |
| **[Spring 生态](docs/02-spring/)** <!-- dir:02-spring --> | Spring Boot、Spring MVC、Spring Security、Spring Cloud |
| **[MySQL](docs/03-mysql/)** <!-- dir:03-mysql --> | MySQL 索引与优化、事务与并发控制 |
| **[PostgreSQL](docs/04-postgresql/)** <!-- dir:04-postgresql --> | PostgreSQL 高级特性 |
| **[缓存](docs/05-redis/)** <!-- dir:05-redis --> | Redis 缓存设计、高可用架构、分布式锁 |
| **[消息队列](docs/06-kafka/)** <!-- dir:06-kafka --> | Kafka 原理与实践、消息可靠性保障 |
| **[搜索引擎](docs/07-elasticsearch/)** <!-- dir:07-elasticsearch --> | Elasticsearch 核心原理、性能优化、数据同步 |
| **[设计模式](docs/08-design-pattern/)** <!-- dir:08-design-pattern --> | 常用设计模式的实现与应用场景 |
| **[软件工程](docs/09-software-engineering/)** <!-- dir:09-software-engineering --> | SOLID 原则、DDD 领域驱动设计、系统架构设计 |

## 🚀 部署流程

本项目是一个静态文档库，部署非常简单：

### 1. 本地部署

1. **克隆项目**
   ```bash
   git clone https://github.com/b1tzer/the-stack.git
   cd the-stack
   ```

2. **安装依赖**（可选，用于本地预览）
   ```bash
   # 安装 MkDocs 或其他文档工具
   pip install mkdocs
   # 或使用 VSCode 的 Markdown 预览功能
   ```

3. **本地预览**
   ```bash
   # 使用 MkDocs
   mkdocs serve
   # 或直接在 VSCode 中打开 Markdown 文件预览
   ```

### 2. 线上部署

本项目可以部署到任何支持静态网站的平台：

#### GitHub Pages
1. 在 GitHub 仓库中启用 GitHub Pages
2. 选择 `main` 分支作为源
3. 访问 `https://b1tzer.github.io/the-stack`

#### Netlify
1. 连接 GitHub 仓库到 Netlify
2. 配置构建命令（如果需要）
3. 部署完成后访问生成的 URL

## 📚 内容导航
[内容导航](docs/index.md)

## 🌟 特色

- **深度解析**：不仅介绍技术用法，更深入剖析底层原理
- **实战导向**：结合实际项目经验，提供可落地的解决方案
- **体系完整**：覆盖从开发环境到架构设计的全链路知识
- **持续更新**：跟进技术发展，不断补充新内容
- **易于导航**：清晰的目录结构，方便快速定位所需内容

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

## 📞 联系方式

- **GitHub**：[https://github.com/b1tzer/the-stack](https://github.com/b1tzer/the-stack)
- **Email**：bltzer@outlook.com

---

> 🎉 感谢您的关注与支持！让我们一起构建更美好的技术生态。