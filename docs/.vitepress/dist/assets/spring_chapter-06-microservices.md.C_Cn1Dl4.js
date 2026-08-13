import{_ as n,C as p,o as l,c as t,a0 as a,E as h}from"./chunks/framework.DQOulFGV.js";const o=JSON.parse('{"title":"第6章 微服务架构","description":"","frontmatter":{},"headers":[],"relativePath":"spring/chapter-06-microservices.md","filePath":"spring/chapter-06-microservices.md"}'),e={name:"spring/chapter-06-microservices.md"};function k(r,s,E,d,g,c){const i=p("SvgDiagram");return l(),t("div",null,[s[0]||(s[0]=a(`<h1 id="第6章-微服务架构" tabindex="-1">第6章 微服务架构 <a class="header-anchor" href="#第6章-微服务架构" aria-label="Permalink to &quot;第6章 微服务架构&quot;">​</a></h1><blockquote><p>当单体应用膨胀到团队无法协作、部署牵一发动全身、性能瓶颈无法针对性扩展时，微服务架构成为必然选择。本章回答三个核心问题：<strong>为什么要拆分服务？拆分后服务之间如何发现彼此？服务之间的调用如何高效、可靠地进行？</strong></p></blockquote><h2 id="_6-1-为什么需要微服务" tabindex="-1">6.1 为什么需要微服务 <a class="header-anchor" href="#_6-1-为什么需要微服务" aria-label="Permalink to &quot;6.1 为什么需要微服务&quot;">​</a></h2><h3 id="_6-1-1-单体架构的困境" tabindex="-1">6.1.1 单体架构的困境 <a class="header-anchor" href="#_6-1-1-单体架构的困境" aria-label="Permalink to &quot;6.1.1 单体架构的困境&quot;">​</a></h3><p>一个典型的单体应用，所有模块打包在一个 WAR/JAR 中：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>单体电商应用</span></span>
<span class="line"><span>┌─────────────────────────────────────────────┐</span></span>
<span class="line"><span>│                                             │</span></span>
<span class="line"><span>│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │</span></span>
<span class="line"><span>│  │ 用户模块  │  │ 商品模块  │  │ 订单模块  │  │</span></span>
<span class="line"><span>│  │ User     │  │ Product  │  │ Order    │  │</span></span>
<span class="line"><span>│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │</span></span>
<span class="line"><span>│       │             │             │         │</span></span>
<span class="line"><span>│  ┌────┴─────────────┴─────────────┴──────┐  │</span></span>
<span class="line"><span>│  │         共享数据库（单个 MySQL）        │  │</span></span>
<span class="line"><span>│  └───────────────────────────────────────┘  │</span></span>
<span class="line"><span>│                                             │</span></span>
<span class="line"><span>│  部署：打成一个 WAR 包，部署到一台 Tomcat     │</span></span>
<span class="line"><span>└─────────────────────────────────────────────┘</span></span></code></pre></div><p><strong>问题一：部署耦合</strong></p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>场景：商品模块修了一个 Bug</span></span>
<span class="line"><span></span></span>
<span class="line"><span>单体架构：</span></span>
<span class="line"><span>商品模块改了 1 行代码</span></span>
<span class="line"><span>    → 整个应用重新编译</span></span>
<span class="line"><span>    → 整个应用重新打包（5 分钟）</span></span>
<span class="line"><span>    → 整个应用重新部署（10 分钟）</span></span>
<span class="line"><span>    → 所有模块都受影响，风险不可控</span></span>
<span class="line"><span></span></span>
<span class="line"><span>微服务架构：</span></span>
<span class="line"><span>商品服务改了 1 行代码</span></span>
<span class="line"><span>    → 只编译商品服务</span></span>
<span class="line"><span>    → 只打包商品服务（30 秒）</span></span>
<span class="line"><span>    → 只部署商品服务（1 分钟）</span></span>
<span class="line"><span>    → 其他服务完全不受影响</span></span></code></pre></div><p><strong>问题二：扩展困难</strong></p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>双十一流量高峰：订单模块需要 10 倍扩容，用户模块流量平稳</span></span>
<span class="line"><span></span></span>
<span class="line"><span>单体架构：</span></span>
<span class="line"><span>    只能整体扩容 → 10 台机器全跑完整应用</span></span>
<span class="line"><span>    用户模块白白占用资源，浪费 90% 的 CPU 和内存</span></span>
<span class="line"><span></span></span>
<span class="line"><span>微服务架构：</span></span>
<span class="line"><span>    订单服务扩容到 10 个实例</span></span>
<span class="line"><span>    用户服务保持 2 个实例</span></span>
<span class="line"><span>    资源精准投放，成本降低 80%</span></span></code></pre></div><p><strong>问题三：团队协作冲突</strong></p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>5 个团队共用一个代码仓库：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>团队 A（用户）：要改数据库表结构</span></span>
<span class="line"><span>团队 B（商品）：要升级 Spring 版本</span></span>
<span class="line"><span>团队 C（订单）：要引入新的消息队列</span></span>
<span class="line"><span>团队 D（支付）：要修改公共工具类</span></span>
<span class="line"><span>团队 E（物流）：要调整构建脚本</span></span>
<span class="line"><span></span></span>
<span class="line"><span>结果：</span></span>
<span class="line"><span>- 每次合并代码都冲突不断</span></span>
<span class="line"><span>- 一个团队的 Bug 导致所有团队回滚</span></span>
<span class="line"><span>- 技术选型被&quot;最低公分母&quot;绑死</span></span></code></pre></div><h3 id="_6-1-2-微服务的核心理念" tabindex="-1">6.1.2 微服务的核心理念 <a class="header-anchor" href="#_6-1-2-微服务的核心理念" aria-label="Permalink to &quot;6.1.2 微服务的核心理念&quot;">​</a></h3><p>微服务不是简单的&quot;把代码拆开&quot;，而是一种架构理念：</p><table tabindex="0"><thead><tr><th>维度</th><th>单体架构</th><th>微服务架构</th></tr></thead><tbody><tr><td>部署单元</td><td>一个应用包</td><td>每个服务独立部署</td></tr><tr><td>数据库</td><td>共享一个数据库</td><td>每个服务独立数据库</td></tr><tr><td>技术栈</td><td>全体统一</td><td>各服务自由选择</td></tr><tr><td>团队组织</td><td>按职能分（前端/后端/DBA）</td><td>按业务分（用户组/订单组/商品组）</td></tr><tr><td>故障隔离</td><td>一个模块挂，全部挂</td><td>服务级隔离，熔断降级</td></tr><tr><td>扩展方式</td><td>整体扩展</td><td>按服务独立扩展</td></tr></tbody></table><h3 id="_6-1-3-微服务拆分后的全景" tabindex="-1">6.1.3 微服务拆分后的全景 <a class="header-anchor" href="#_6-1-3-微服务拆分后的全景" aria-label="Permalink to &quot;6.1.3 微服务拆分后的全景&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>┌─────────────────────────────────────────────────────────────────┐</span></span>
<span class="line"><span>│                        微服务电商架构                             │</span></span>
<span class="line"><span>│                                                                 │</span></span>
<span class="line"><span>│   用户端                                                        │</span></span>
<span class="line"><span>│     │                                                           │</span></span>
<span class="line"><span>│     ▼                                                           │</span></span>
<span class="line"><span>│  ┌──────────┐                                                   │</span></span>
<span class="line"><span>│  │ API 网关  │  ← 统一入口、路由、鉴权、限流                      │</span></span>
<span class="line"><span>│  │ Gateway  │                                                   │</span></span>
<span class="line"><span>│  └──┬───┬───┘                                                   │</span></span>
<span class="line"><span>│     │   │    ┌──────────────┐                                   │</span></span>
<span class="line"><span>│     │   ├───→│ 用户服务      │───→ [用户数据库]                   │</span></span>
<span class="line"><span>│     │   │    │ User Service │                                   │</span></span>
<span class="line"><span>│     │   │    └──────────────┘                                   │</span></span>
<span class="line"><span>│     │   │    ┌──────────────┐                                   │</span></span>
<span class="line"><span>│     │   ├───→│ 商品服务      │───→ [商品数据库]                   │</span></span>
<span class="line"><span>│     │   │    │ Product Svc  │                                   │</span></span>
<span class="line"><span>│     │   │    └──────────────┘                                   │</span></span>
<span class="line"><span>│     │   │    ┌──────────────┐                                   │</span></span>
<span class="line"><span>│     │   └───→│ 订单服务      │───→ [订单数据库]                   │</span></span>
<span class="line"><span>│     │        │ Order Service│                                   │</span></span>
<span class="line"><span>│     │        └──────┬───────┘                                   │</span></span>
<span class="line"><span>│     │               │                                           │</span></span>
<span class="line"><span>│     │    ┌──────────┴──────────┐                                │</span></span>
<span class="line"><span>│     │    ▼                     ▼                                │</span></span>
<span class="line"><span>│  ┌──────────────┐   ┌──────────────┐                           │</span></span>
<span class="line"><span>│  │ 商品服务（RPC）│   │ 用户服务（RPC）│                           │</span></span>
<span class="line"><span>│  └──────────────┘   └──────────────┘                           │</span></span>
<span class="line"><span>│                                                                 │</span></span>
<span class="line"><span>│  ┌──────────────┐                                               │</span></span>
<span class="line"><span>│  │ 注册中心      │  ← Nacos / Eureka / Consul                   │</span></span>
<span class="line"><span>│  │ Registry     │                                               │</span></span>
<span class="line"><span>│  └──────────────┘                                               │</span></span>
<span class="line"><span>└─────────────────────────────────────────────────────────────────┘</span></span></code></pre></div><hr><h2 id="_6-2-服务注册与发现" tabindex="-1">6.2 服务注册与发现 <a class="header-anchor" href="#_6-2-服务注册与发现" aria-label="Permalink to &quot;6.2 服务注册与发现&quot;">​</a></h2><h3 id="_6-2-1-为什么需要服务发现" tabindex="-1">6.2.1 为什么需要服务发现 <a class="header-anchor" href="#_6-2-1-为什么需要服务发现" aria-label="Permalink to &quot;6.2.1 为什么需要服务发现&quot;">​</a></h3><p>在微服务架构中，服务实例的 IP 和端口是动态变化的：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>传统方式（硬编码地址）：</span></span>
<span class="line"><span>OrderService 调用 UserService：</span></span>
<span class="line"><span>    → http://192.168.1.10:8081/user/1</span></span>
<span class="line"><span></span></span>
<span class="line"><span>问题：</span></span>
<span class="line"><span>- UserService 扩容到 3 个实例，地址变了怎么办？</span></span>
<span class="line"><span>- UserService 某个实例宕机了怎么感知？</span></span>
<span class="line"><span>- 每个服务都要维护其他所有服务的地址列表？（N×N 复杂度）</span></span></code></pre></div><h3 id="_6-2-2-服务发现的核心流程" tabindex="-1">6.2.2 服务发现的核心流程 <a class="header-anchor" href="#_6-2-2-服务发现的核心流程" aria-label="Permalink to &quot;6.2.2 服务发现的核心流程&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>┌──────────────────────────────────────────────────────────────┐</span></span>
<span class="line"><span>│                    服务发现全流程                               │</span></span>
<span class="line"><span>│                                                              │</span></span>
<span class="line"><span>│  Provider（服务提供者）         Registry（注册中心）            │</span></span>
<span class="line"><span>│  ┌──────────────┐            ┌──────────────┐               │</span></span>
<span class="line"><span>│  │ 1. 启动       │            │              │               │</span></span>
<span class="line"><span>│  │ 2. 注册地址   │───注册────→│ 存储服务实例  │               │</span></span>
<span class="line"><span>│  │   IP:Port    │            │ 列表          │               │</span></span>
<span class="line"><span>│  └──────────────┘            │              │               │</span></span>
<span class="line"><span>│                              │  UserService:│               │</span></span>
<span class="line"><span>│                              │  ├─10.0.0.1:8081              │</span></span>
<span class="line"><span>│                              │  ├─10.0.0.2:8081              │</span></span>
<span class="line"><span>│                              │  └─10.0.0.3:8081              │</span></span>
<span class="line"><span>│                              └──────┬───────┘               │</span></span>
<span class="line"><span>│                                     │                        │</span></span>
<span class="line"><span>│ Consumer（服务消费者）                │                        │</span></span>
<span class="line"><span>│ ┌──────────────┐                    │                        │</span></span>
<span class="line"><span>│ │ 3. 订阅服务   │────订阅────────────┘                        │</span></span>
<span class="line"><span>│ │ 4. 获取实例   │←──推送/拉取──                               │</span></span>
<span class="line"><span>│ │   列表       │                                             │</span></span>
<span class="line"><span>│ │ 5. 负载均衡  │                                             │</span></span>
<span class="line"><span>│ │   选择实例   │                                             │</span></span>
<span class="line"><span>│ │ 6. 发起调用  │───HTTP/RPC──→ Provider                      │</span></span>
<span class="line"><span>│ └──────────────┘                                             │</span></span>
<span class="line"><span>│                                                              │</span></span>
<span class="line"><span>│ 7. 心跳检测（Provider 定期向 Registry 报告存活）               │</span></span>
<span class="line"><span>│ 8. 健康检查（Registry 剔除不健康实例）                         │</span></span>
<span class="line"><span>└──────────────────────────────────────────────────────────────┘</span></span></code></pre></div><h3 id="_6-2-3-nacos-作为注册中心" tabindex="-1">6.2.3 Nacos 作为注册中心 <a class="header-anchor" href="#_6-2-3-nacos-作为注册中心" aria-label="Permalink to &quot;6.2.3 Nacos 作为注册中心&quot;">​</a></h3><p>Nacos 是阿里巴巴开源的服务发现和配置管理平台，支持 AP（临时实例）和 CP（持久实例）两种模式。</p><p><strong>Provider 注册</strong>：</p><div class="language-yaml vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># application.yml - 服务提供者配置</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">spring</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  application</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    name</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">user-service</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  cloud</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    nacos</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">      discovery</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">        server-addr</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">127.0.0.1:8848</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">        namespace</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">dev</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">        group</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">DEFAULT_GROUP</span></span></code></pre></div><div class="language-java vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">java</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">@</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">SpringBootApplication</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">@</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">EnableDiscoveryClient</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">  // 启用服务注册（Spring Boot 2.7+ 可省略）</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">public</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> class</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> UserServiceApplication</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    public</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> static</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> void</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> main</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">String</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[] </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">args</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        SpringApplication.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">run</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(UserServiceApplication.class, args);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    }</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><p>启动后，Nacos 控制台会显示注册信息：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>服务列表</span></span>
<span class="line"><span>├── user-service</span></span>
<span class="line"><span>│   ├── 192.168.1.10:8081  (healthy)</span></span>
<span class="line"><span>│   ├── 192.168.1.11:8081  (healthy)</span></span>
<span class="line"><span>│   └── 192.168.1.12:8081  (healthy)</span></span>
<span class="line"><span>├── order-service</span></span>
<span class="line"><span>│   ├── 192.168.1.20:8082  (healthy)</span></span>
<span class="line"><span>│   └── 192.168.1.21:8082  (healthy)</span></span>
<span class="line"><span>└── product-service</span></span>
<span class="line"><span>    └── 192.168.1.30:8083  (healthy)</span></span></code></pre></div><p><strong>Consumer 发现并调用</strong>：</p><div class="language-java vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">java</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">@</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">RestController</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">@</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">RequestMapping</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;/order&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">public</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> class</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> OrderController</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    @</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">Autowired</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    private</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> DiscoveryClient discoveryClient;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    @</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">GetMapping</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;/{orderId}&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    public</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Order </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getOrder</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(@</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">PathVariable</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Long </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">orderId</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        // 获取 user-service 的所有实例</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        List&lt;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">ServiceInstance</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt; instances </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            discoveryClient.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getInstances</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;user-service&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        // 负载均衡选择一个实例</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        ServiceInstance instance </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> instances.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">get</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            ThreadLocalRandom.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">current</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">().</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">nextInt</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(instances.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">size</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">())</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        );</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        // 发起 HTTP 调用</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        String url </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;http://&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> instance.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getHost</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">()</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">                   +</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;:&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> instance.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getPort</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">()</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">                   +</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;/user/&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> orderId;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        User user </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> restTemplate.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getForObject</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(url, User.class);</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        // 构建订单返回</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">        return</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> new</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> Order</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(orderId, user, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;...&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    }</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><h3 id="_6-2-4-负载均衡策略" tabindex="-1">6.2.4 负载均衡策略 <a class="header-anchor" href="#_6-2-4-负载均衡策略" aria-label="Permalink to &quot;6.2.4 负载均衡策略&quot;">​</a></h3><p>当一个服务有多个实例时，需要决定调用哪个实例：</p><table tabindex="0"><thead><tr><th>策略</th><th>说明</th><th>适用场景</th></tr></thead><tbody><tr><td><strong>Round Robin</strong></td><td>轮询，依次调用</td><td>通用场景，实例性能均匀</td></tr><tr><td><strong>Weighted</strong></td><td>按权重分配</td><td>实例性能不均，按比例分配</td></tr><tr><td><strong>Random</strong></td><td>随机选择</td><td>简单场景</td></tr><tr><td><strong>Least Connections</strong></td><td>选择连接数最少的</td><td>长连接场景</td></tr><tr><td><strong>Consistent Hash</strong></td><td>相同参数始终路由到同一实例</td><td>有状态服务，会话保持</td></tr></tbody></table><h3 id="_6-2-5-注册中心对比" tabindex="-1">6.2.5 注册中心对比 <a class="header-anchor" href="#_6-2-5-注册中心对比" aria-label="Permalink to &quot;6.2.5 注册中心对比&quot;">​</a></h3><table tabindex="0"><thead><tr><th>特性</th><th>Nacos</th><th>Eureka</th><th>Consul</th></tr></thead><tbody><tr><td>一致性协议</td><td>AP + CP</td><td>AP</td><td>CP</td></tr><tr><td>健康检查</td><td>TCP/HTTP/MySQL/自定义</td><td>客户端心跳</td><td>TCP/HTTP/gRPC/脚本</td></tr><tr><td>配置管理</td><td>✅ 内置</td><td>❌ 需要配合 Spring Cloud Config</td><td>✅ 内置</td></tr><tr><td>管理界面</td><td>✅ 功能丰富</td><td>✅ 基础</td><td>✅ 功能丰富</td></tr><tr><td>多数据中心</td><td>✅</td><td>❌</td><td>✅ 原生支持</td></tr><tr><td>社区活跃度</td><td>高（阿里维护）</td><td>中（Netflix 维护减少）</td><td>高（HashiCorp 维护）</td></tr><tr><td>国内使用率</td><td>★★★★★</td><td>★★★</td><td>★★</td></tr></tbody></table><hr><h2 id="_6-3-api-gateway" tabindex="-1">6.3 API Gateway <a class="header-anchor" href="#_6-3-api-gateway" aria-label="Permalink to &quot;6.3 API Gateway&quot;">​</a></h2><h3 id="_6-3-1-为什么需要网关" tabindex="-1">6.3.1 为什么需要网关 <a class="header-anchor" href="#_6-3-1-为什么需要网关" aria-label="Permalink to &quot;6.3.1 为什么需要网关&quot;">​</a></h3><p>没有网关时，客户端直接调用各个微服务：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>没有网关的问题：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>手机端 ──→ 用户服务（需要处理鉴权）</span></span>
<span class="line"><span>       ──→ 商品服务（需要处理鉴权）</span></span>
<span class="line"><span>       ──→ 订单服务（需要处理鉴权）</span></span>
<span class="line"><span>       ──→ 支付服务（需要处理鉴权）</span></span>
<span class="line"><span></span></span>
<span class="line"><span>每个服务都要：</span></span>
<span class="line"><span>- 实现 JWT 验证逻辑</span></span>
<span class="line"><span>- 配置 CORS 跨域</span></span>
<span class="line"><span>- 实现限流保护</span></span>
<span class="line"><span>- 记录访问日志</span></span>
<span class="line"><span>- 处理 SSL 证书</span></span>
<span class="line"><span></span></span>
<span class="line"><span>→ 大量重复代码，维护成本极高</span></span></code></pre></div><p>引入网关后：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>手机端 ──→ API Gateway ──→ 用户服务（专注业务）</span></span>
<span class="line"><span>                    ──→ 商品服务（专注业务）</span></span>
<span class="line"><span>                    ──→ 订单服务（专注业务）</span></span>
<span class="line"><span>                    ──→ 支付服务（专注业务）</span></span>
<span class="line"><span></span></span>
<span class="line"><span>网关统一处理：</span></span>
<span class="line"><span>✅ 路由转发</span></span>
<span class="line"><span>✅ 统一鉴权</span></span>
<span class="line"><span>✅ 限流熔断</span></span>
<span class="line"><span>✅ 日志记录</span></span>
<span class="line"><span>✅ 跨域处理</span></span>
<span class="line"><span>✅ 协议转换</span></span></code></pre></div><h3 id="_6-3-2-spring-cloud-gateway-核心概念" tabindex="-1">6.3.2 Spring Cloud Gateway 核心概念 <a class="header-anchor" href="#_6-3-2-spring-cloud-gateway-核心概念" aria-label="Permalink to &quot;6.3.2 Spring Cloud Gateway 核心概念&quot;">​</a></h3><p>Spring Cloud Gateway 基于 WebFlux（响应式编程），核心由三部分组成：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>请求进入</span></span>
<span class="line"><span>    │</span></span>
<span class="line"><span>    ▼</span></span>
<span class="line"><span>┌──────────┐    ┌──────────┐    ┌──────────┐</span></span>
<span class="line"><span>│  Route   │───→│ Predicate │───→│  Filter  │───→ 后端服务</span></span>
<span class="line"><span>│  路由     │    │  断言     │    │  过滤器   │</span></span>
<span class="line"><span>└──────────┘    └──────────┘    └──────────┘</span></span>
<span class="line"><span>    │               │               │</span></span>
<span class="line"><span>    定义路由规则      判断是否匹配      请求/响应处理</span></span></code></pre></div><p><strong>Route（路由）</strong>：一组规则的集合，包含目标 URI、断言和过滤器。</p><p><strong>Predicate（断言）</strong>：匹配条件，基于 HTTP 请求的任何内容（路径、头、参数等）。</p><p><strong>Filter（过滤器）</strong>：对请求和响应进行修改，分为 <code>GatewayFilter</code>（单路由）和 <code>GlobalFilter</code>（全局）。</p><h3 id="_6-3-3-网关配置示例" tabindex="-1">6.3.3 网关配置示例 <a class="header-anchor" href="#_6-3-3-网关配置示例" aria-label="Permalink to &quot;6.3.3 网关配置示例&quot;">​</a></h3><div class="language-yaml vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># application.yml - Spring Cloud Gateway 配置</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">spring</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">  cloud</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">    gateway</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">      routes</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        # 用户服务路由</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">id</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">user-service</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">          uri</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">lb://user-service</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">          # lb:// 表示从注册中心获取地址</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">          predicates</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            - </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">Path=/api/user/**</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">           # 匹配路径</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">          filters</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            - </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">StripPrefix=1</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">               # 去掉 /api 前缀</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">name</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">RequestRateLimiter</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">    # 限流过滤器</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">              args</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">                redis-rate-limiter.replenishRate</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">10</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">                redis-rate-limiter.burstCapacity</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">20</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        # 商品服务路由</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">id</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">product-service</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">          uri</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">lb://product-service</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">          predicates</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            - </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">Path=/api/product/**</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">          filters</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            - </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">StripPrefix=1</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        # 订单服务路由</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        - </span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">id</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">order-service</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">          uri</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">lb://order-service</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">          predicates</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            - </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">Path=/api/order/**</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            - </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">Method=GET,POST</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">             # 只允许 GET 和 POST</span></span>
<span class="line"><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">          filters</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            - </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">StripPrefix=1</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            - </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">AddRequestHeader=X-Request-Source, gateway</span></span></code></pre></div><h3 id="_6-3-4-全局鉴权过滤器" tabindex="-1">6.3.4 全局鉴权过滤器 <a class="header-anchor" href="#_6-3-4-全局鉴权过滤器" aria-label="Permalink to &quot;6.3.4 全局鉴权过滤器&quot;">​</a></h3><div class="language-java vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">java</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">@</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">Component</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">public</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> class</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> AuthGlobalFilter</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> implements</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> GlobalFilter</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Ordered</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    @</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">Override</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    public</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Mono&lt;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">Void</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt; </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">filter</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(ServerWebExchange </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">exchange</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, GatewayFilterChain </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">chain</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        String path </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> exchange.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getRequest</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">().</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getPath</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">().</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">value</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">();</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        // 白名单路径，无需鉴权</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">        if</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> (</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">isWhiteListed</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(path)) {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">            return</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> chain.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">filter</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(exchange);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        }</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        // 获取 Token</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        String token </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> exchange.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getRequest</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">().</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getHeaders</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">()</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">                         .</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getFirst</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;Authorization&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">        if</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> (token </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">==</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> null</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> ||</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> !</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">token.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">startsWith</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;Bearer &quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)) {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            exchange.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getResponse</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">().</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">setStatusCode</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(HttpStatus.UNAUTHORIZED);</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">            return</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> exchange.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getResponse</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">().</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">setComplete</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">();</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        }</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        // 验证 JWT</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">        try</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            Claims claims </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> JwtUtils.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">parseToken</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(token.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">substring</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">7</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">));</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">            // 将用户信息传递给下游服务</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            ServerHttpRequest request </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> exchange.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getRequest</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">().</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">mutate</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">()</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">                .</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">header</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;X-User-Id&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, claims.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getSubject</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">())</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">                .</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">header</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;X-User-Role&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, claims.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">get</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;role&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, String.class))</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">                .</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">build</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">();</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">            return</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> chain.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">filter</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(exchange.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">mutate</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">().</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">request</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(request).</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">build</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">());</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        } </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">catch</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> (Exception </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">e</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            exchange.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getResponse</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">().</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">setStatusCode</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(HttpStatus.UNAUTHORIZED);</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">            return</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> exchange.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getResponse</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">().</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">setComplete</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">();</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        }</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    }</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    @</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">Override</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    public</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> int</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> getOrder</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">() {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">        return</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> -</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">100</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;  </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 高优先级</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    }</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><h3 id="_6-3-5-网关处理流程" tabindex="-1">6.3.5 网关处理流程 <a class="header-anchor" href="#_6-3-5-网关处理流程" aria-label="Permalink to &quot;6.3.5 网关处理流程&quot;">​</a></h3>`,56)),h(i,{src:"/diagrams/microservice-request-flow.svg"}),s[1]||(s[1]=a(`<hr><h2 id="_6-4-服务调用" tabindex="-1">6.4 服务调用 <a class="header-anchor" href="#_6-4-服务调用" aria-label="Permalink to &quot;6.4 服务调用&quot;">​</a></h2><h3 id="_6-4-1-远程调用的核心问题" tabindex="-1">6.4.1 远程调用的核心问题 <a class="header-anchor" href="#_6-4-1-远程调用的核心问题" aria-label="Permalink to &quot;6.4.1 远程调用的核心问题&quot;">​</a></h3><p>微服务之间的通信本质上是网络调用，需要解决：</p><ol><li><strong>如何找到对方</strong> → 服务发现（上一节已解决）</li><li><strong>如何调用</strong> → HTTP / RPC / 消息队列</li><li><strong>如何保证可靠性</strong> → 超时、重试、熔断</li><li><strong>如何保证性能</strong> → 连接池、序列化、协议选择</li></ol><h3 id="_6-4-2-openfeign-声明式调用" tabindex="-1">6.4.2 OpenFeign 声明式调用 <a class="header-anchor" href="#_6-4-2-openfeign-声明式调用" aria-label="Permalink to &quot;6.4.2 OpenFeign 声明式调用&quot;">​</a></h3><p>OpenFeign 让远程调用像调用本地方法一样简单：</p><div class="language-java vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">java</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 1. 定义 Feign 客户端接口</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">@</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">FeignClient</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">    name</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;user-service&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,           </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 目标服务名</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">    fallbackFactory</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> UserClientFallbackFactory.class  </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 降级处理</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">public</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> interface</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> UserClient</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    @</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">GetMapping</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;/user/{id}&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    User </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getUser</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(@</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">PathVariable</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;id&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) Long </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">id</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    @</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">PostMapping</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;/user&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    User </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">createUser</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(@</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">RequestBody</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> User </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">user</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    @</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">GetMapping</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;/user/search&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    List&lt;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">User</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt; </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">searchUsers</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(@</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">RequestParam</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;keyword&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) String </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">keyword</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 2. 降级处理</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">@</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">Component</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">public</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> class</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> UserClientFallbackFactory</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">        implements</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> FallbackFactory</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&lt;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">UserClient</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt; {</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    @</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">Override</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    public</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> UserClient </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">create</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(Throwable </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">cause</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">        return</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> new</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> UserClient</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">() {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            @</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">Override</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">            public</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> User </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getUser</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(Long </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">id</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">                // 降级：返回默认用户</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">                return</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> new</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> User</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(id, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;未知用户&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;服务暂时不可用&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            }</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            @</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">Override</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">            public</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> User </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">createUser</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(User </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">user</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">                throw</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> new</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> RuntimeException</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;用户服务不可用，无法创建用户&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, cause);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            }</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            @</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">Override</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">            public</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> List&lt;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">User</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt; </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">searchUsers</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(String </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">keyword</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">                return</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Collections.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">emptyList</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">();</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            }</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        };</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    }</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 3. 在业务代码中使用</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">@</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">Service</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">public</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> class</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> OrderService</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    @</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">Autowired</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    private</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> UserClient userClient;  </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 像调用本地方法一样</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    @</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">Transactional</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    public</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Order </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">createOrder</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(Long </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">userId</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, Long </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">productId</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        // 远程调用用户服务</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        User user </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> userClient.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getUser</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(userId);  </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 透明的远程调用</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        // 远程调用商品服务</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        Product product </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> productClient.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getProduct</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(productId);</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">        // 创建订单</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">        return</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> orderRepository.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">save</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">new</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> Order</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(user, product));</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    }</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><p><strong>OpenFeign 的工作原理</strong>：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>OrderService.createOrder()</span></span>
<span class="line"><span>    │</span></span>
<span class="line"><span>    ├── userClient.getUser(1L)     ← 看起来像本地调用</span></span>
<span class="line"><span>    │       │</span></span>
<span class="line"><span>    │       ▼</span></span>
<span class="line"><span>    │   UserClient 是 JDK 动态代理</span></span>
<span class="line"><span>    │       │</span></span>
<span class="line"><span>    │       ▼</span></span>
<span class="line"><span>    │   FeignInvocationHandler.invoke()</span></span>
<span class="line"><span>    │       │</span></span>
<span class="line"><span>    │       ▼</span></span>
<span class="line"><span>    │   MethodHandler.dispatch()</span></span>
<span class="line"><span>    │       │</span></span>
<span class="line"><span>    │       ├── 1. 解析注解：GET /user/{id}</span></span>
<span class="line"><span>    │       ├── 2. 参数替换：/user/1</span></span>
<span class="line"><span>    │       ├── 3. 服务发现：user-service → 192.168.1.10:8081</span></span>
<span class="line"><span>    │       ├── 4. 负载均衡：选择一个实例</span></span>
<span class="line"><span>    │       ├── 5. 构建 HTTP 请求</span></span>
<span class="line"><span>    │       ├── 6. 发送请求（通过 LoadBalancerInterceptor）</span></span>
<span class="line"><span>    │       └── 7. 响应反序列化为 User 对象</span></span>
<span class="line"><span>    │</span></span>
<span class="line"><span>    └── 返回 User 对象</span></span></code></pre></div><h3 id="_6-4-3-dubbo-rpc-调用" tabindex="-1">6.4.3 Dubbo RPC 调用 <a class="header-anchor" href="#_6-4-3-dubbo-rpc-调用" aria-label="Permalink to &quot;6.4.3 Dubbo RPC 调用&quot;">​</a></h3><p>Dubbo 是阿里开源的高性能 RPC 框架，使用自定义协议，性能优于 HTTP：</p><div class="language-java vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">java</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 1. 定义服务接口（需要独立的 API 模块）</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">public</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> interface</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> UserService</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    User </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getUser</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(Long </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">id</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 2. 服务提供者实现</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">@</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">DubboService</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">version</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;1.0.0&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">public</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> class</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> UserServiceImpl</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> implements</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> UserService</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    @</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">Override</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    public</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> User </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getUser</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(Long </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">id</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">        return</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> userRepository.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">findById</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(id).</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">orElse</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">null</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    }</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 3. 服务消费者调用</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">@</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">RestController</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">@</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">RequestMapping</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;/order&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">public</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> class</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> OrderController</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    @</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">DubboReference</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">version</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;1.0.0&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">timeout</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 3000</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">retries</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 2</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    private</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> UserService userService;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    @</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">GetMapping</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;/{orderId}&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    public</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Order </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getOrder</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(@</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">PathVariable</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Long </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">orderId</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        Order order </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> orderRepository.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">findById</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(orderId);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        User user </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> userService.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getUser</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(order.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getUserId</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">());</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">        return</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> order.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">withUser</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(user);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    }</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><h3 id="_6-4-4-grpc-调用" tabindex="-1">6.4.4 gRPC 调用 <a class="header-anchor" href="#_6-4-4-grpc-调用" aria-label="Permalink to &quot;6.4.4 gRPC 调用&quot;">​</a></h3><p>gRPC 基于 HTTP/2 + Protocol Buffers，适合高性能、跨语言场景：</p><div class="language-protobuf vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">protobuf</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// user.proto</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">syntax</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;proto3&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">service</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> UserService</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    rpc</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> GetUser</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> (</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">GetUserRequest</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">returns</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> (</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">UserResponse</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    rpc</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> SearchUsers</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> (</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">SearchRequest</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">returns</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> (</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">stream</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> UserResponse</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">message</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> GetUserRequest</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    int64</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> id </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 1</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">message</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> UserResponse</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    int64</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> id </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 1</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    string</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> name </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 2</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    string</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> email </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 3</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><h3 id="_6-4-5-三种调用方式全面对比" tabindex="-1">6.4.5 三种调用方式全面对比 <a class="header-anchor" href="#_6-4-5-三种调用方式全面对比" aria-label="Permalink to &quot;6.4.5 三种调用方式全面对比&quot;">​</a></h3><table tabindex="0"><thead><tr><th>特性</th><th>OpenFeign</th><th>Dubbo</th><th>gRPC</th></tr></thead><tbody><tr><td><strong>协议</strong></td><td>HTTP/1.1 (REST)</td><td>自定义 TCP 协议</td><td>HTTP/2</td></tr><tr><td><strong>序列化</strong></td><td>JSON</td><td>Hessian2 / Protobuf</td><td>Protobuf</td></tr><tr><td><strong>性能</strong></td><td>★★★ 较低</td><td>★★★★★ 高</td><td>★★★★ 较高</td></tr><tr><td><strong>跨语言</strong></td><td>✅ 天然支持（REST）</td><td>❌ 主要 Java</td><td>✅ 多语言支持</td></tr><tr><td><strong>服务治理</strong></td><td>依赖 Spring Cloud</td><td>✅ 内置丰富</td><td>需配合 Istio 等</td></tr><tr><td><strong>学习成本</strong></td><td>★★ 低</td><td>★★★ 中</td><td>★★★★ 较高</td></tr><tr><td><strong>调试友好</strong></td><td>✅ 可用 curl/浏览器</td><td>❌ 需专用工具</td><td>❌ 需专用工具</td></tr><tr><td><strong>接口定义</strong></td><td>Java 接口 + 注解</td><td>Java 接口</td><td>.proto 文件</td></tr><tr><td><strong>连接模型</strong></td><td>短连接（每次请求新建）</td><td>长连接（连接复用）</td><td>长连接（多路复用）</td></tr><tr><td><strong>适用场景</strong></td><td>对外 API、前后端交互</td><td>内部高性能调用</td><td>跨语言、流式通信</td></tr><tr><td><strong>国内生态</strong></td><td>Spring Cloud 全家桶</td><td>阿里系生态</td><td>谷歌系、云原生</td></tr></tbody></table><h3 id="_6-4-6-调用方式选择决策树" tabindex="-1">6.4.6 调用方式选择决策树 <a class="header-anchor" href="#_6-4-6-调用方式选择决策树" aria-label="Permalink to &quot;6.4.6 调用方式选择决策树&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>需要服务间调用</span></span>
<span class="line"><span>    │</span></span>
<span class="line"><span>    ├── 需要跨语言？（Go/Python/Java 混合）</span></span>
<span class="line"><span>    │       │</span></span>
<span class="line"><span>    │       ├── 是 → gRPC</span></span>
<span class="line"><span>    │       │</span></span>
<span class="line"><span>    │       └── 否 → 继续判断</span></span>
<span class="line"><span>    │</span></span>
<span class="line"><span>    ├── 对外暴露 API？（前端/第三方调用）</span></span>
<span class="line"><span>    │       │</span></span>
<span class="line"><span>    │       ├── 是 → OpenFeign / REST Controller</span></span>
<span class="line"><span>    │       │</span></span>
<span class="line"><span>    │       └── 否 → 继续判断</span></span>
<span class="line"><span>    │</span></span>
<span class="line"><span>    ├── 性能敏感？（高 QPS、低延迟）</span></span>
<span class="line"><span>    │       │</span></span>
<span class="line"><span>    │       ├── 是 → Dubbo 或 gRPC</span></span>
<span class="line"><span>    │       │</span></span>
<span class="line"><span>    │       └── 否 → OpenFeign（开发效率最高）</span></span>
<span class="line"><span>    │</span></span>
<span class="line"><span>    └── 阿里技术栈？</span></span>
<span class="line"><span>            │</span></span>
<span class="line"><span>            ├── 是 → Dubbo（生态完善）</span></span>
<span class="line"><span>            │</span></span>
<span class="line"><span>            └── 否 → OpenFeign（Spring Cloud 生态）</span></span></code></pre></div><h3 id="_6-4-7-可靠性保障-熔断与降级" tabindex="-1">6.4.7 可靠性保障：熔断与降级 <a class="header-anchor" href="#_6-4-7-可靠性保障-熔断与降级" aria-label="Permalink to &quot;6.4.7 可靠性保障：熔断与降级&quot;">​</a></h3><p>无论选择哪种调用方式，都需要处理服务不可用的情况。Sentinel 是常用的流量治理组件：</p><div class="language-java vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">java</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// Sentinel 熔断降级配置</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">@</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">SentinelResource</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">    value</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;getUser&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">    blockHandler</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;getUserBlockHandler&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">    fallback</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;getUserFallback&quot;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">public</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> User </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getUser</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(Long id) {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    return</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> userClient.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getUser</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(id);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 被限流或降级时的处理</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">public</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> User </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getUserBlockHandler</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(Long id, BlockException ex) {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    return</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> new</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> User</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(id, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;系统繁忙，请稍后重试&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 服务调用异常时的降级处理</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">public</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> User </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">getUserFallback</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(Long id, Throwable t) {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    return</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> new</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> User</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(id, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;服务暂时不可用&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">);</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>服务调用可靠性保障链路：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>请求进入</span></span>
<span class="line"><span>    │</span></span>
<span class="line"><span>    ▼</span></span>
<span class="line"><span>┌──────────────┐</span></span>
<span class="line"><span>│  限流         │  ← 控制 QPS，防止过载</span></span>
<span class="line"><span>│  Rate Limit  │</span></span>
<span class="line"><span>└──────┬───────┘</span></span>
<span class="line"><span>       │</span></span>
<span class="line"><span>       ▼</span></span>
<span class="line"><span>┌──────────────┐</span></span>
<span class="line"><span>│  熔断         │  ← 错误率过高时切断调用</span></span>
<span class="line"><span>│  Circuit     │</span></span>
<span class="line"><span>│  Breaker     │</span></span>
<span class="line"><span>└──────┬───────┘</span></span>
<span class="line"><span>       │</span></span>
<span class="line"><span>       ▼</span></span>
<span class="line"><span>┌──────────────┐</span></span>
<span class="line"><span>│  降级         │  ← 返回兜底数据</span></span>
<span class="line"><span>│  Fallback    │</span></span>
<span class="line"><span>└──────┬───────┘</span></span>
<span class="line"><span>       │</span></span>
<span class="line"><span>       ▼</span></span>
<span class="line"><span>┌──────────────┐</span></span>
<span class="line"><span>│  重试         │  ← 可恢复错误自动重试</span></span>
<span class="line"><span>│  Retry       │</span></span>
<span class="line"><span>└──────┬───────┘</span></span>
<span class="line"><span>       │</span></span>
<span class="line"><span>       ▼</span></span>
<span class="line"><span>┌──────────────┐</span></span>
<span class="line"><span>│  超时         │  ← 设置合理超时时间</span></span>
<span class="line"><span>│  Timeout     │</span></span>
<span class="line"><span>└──────┬───────┘</span></span>
<span class="line"><span>       │</span></span>
<span class="line"><span>       ▼</span></span>
<span class="line"><span>  正常返回 / 兜底返回</span></span></code></pre></div><hr><blockquote><p>服务拆开了，但问题也来了：配置散落各处怎么管？一个服务挂了会不会雪崩？流量突增怎么办？请求链路如同黑盒怎么排查？下一章讲分布式系统治理的四大手段：配置中心、服务容错、限流降级、链路追踪。</p></blockquote>`,26))])}const F=n(e,[["render",k]]);export{o as __pageData,F as default};
