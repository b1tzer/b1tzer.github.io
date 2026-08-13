import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'The Stack',
  description: '系统化的 Java 后端技术分析',
  lang: 'zh-CN',
  
  themeConfig: {
    logo: '/assets/logo.svg',
    
    nav: [
      { text: '首页', link: '/' },
      { text: 'Java', link: '/java/01-language/' },
      { text: 'Spring', link: '/spring/' },
      { text: 'Redis', link: '/redis/' },
      { text: '更多', items: [
        { text: 'PostgreSQL', link: '/postgresql/' },
        { text: 'Kafka', link: '/kafka/' },
        { text: 'Elasticsearch', link: '/elasticsearch/' },
        { text: '设计模式', link: '/design-pattern/' },
        { text: '软件工程', link: '/engineering/' },
        { text: 'AI 工程', link: '/ai/' },
      ]}
    ],
    
    sidebar: {
      '/java/': [
        {
          text: '语言基础',
          items: [
            { text: '类型系统', link: '/java/01-language/chapter-01-type-system' },
            { text: '面向对象', link: '/java/01-language/chapter-02-oop' },
            { text: '泛型', link: '/java/01-language/chapter-03-generics' },
            { text: '注解与 Lambda', link: '/java/01-language/chapter-04-annotation-lambda' },
          ]
        },
        {
          text: 'JVM',
          items: [
            { text: '字节码与类加载', link: '/java/02-jvm/chapter-01-bytecode-classloading' },
            { text: '内存模型', link: '/java/02-jvm/chapter-02-memory-model' },
            { text: '对象模型', link: '/java/02-jvm/chapter-03-object-model' },
            { text: 'GC', link: '/java/02-jvm/chapter-04-gc' },
            { text: 'JIT', link: '/java/02-jvm/chapter-05-jit' },
            { text: '诊断实战', link: '/java/02-jvm/chapter-06-diagnostics' },
          ]
        },
        {
          text: '并发编程',
          items: [
            { text: '为什么需要并发', link: '/java/03-concurrency/chapter-01-why-concurrency' },
            { text: '线程模型', link: '/java/03-concurrency/chapter-02-thread-model' },
            { text: 'ThreadLocal', link: '/java/03-concurrency/chapter-03-threadlocal' },
            { text: 'JMM', link: '/java/03-concurrency/chapter-04-jmm' },
            { text: 'volatile', link: '/java/03-concurrency/chapter-05-volatile' },
            { text: 'synchronized', link: '/java/03-concurrency/chapter-06-synchronized' },
            { text: 'CAS 与原子类', link: '/java/03-concurrency/chapter-07-cas-atomic' },
            { text: 'LockSupport 与 AQS', link: '/java/03-concurrency/chapter-08-locksupport-aqs' },
            { text: '并发集合', link: '/java/03-concurrency/chapter-09-concurrent-collections' },
            { text: '线程池', link: '/java/03-concurrency/chapter-10-thread-pool' },
            { text: '异步模型', link: '/java/03-concurrency/chapter-11-async-model' },
            { text: '虚拟线程', link: '/java/03-concurrency/chapter-12-virtual-thread' },
            { text: '诊断实战', link: '/java/03-concurrency/chapter-13-diagnostics' },
          ]
        },
        {
          text: '网络编程',
          items: [
            { text: '网络基础', link: '/java/04-network/chapter-01-network-basics' },
            { text: 'TCP/IP', link: '/java/04-network/chapter-02-tcp-ip' },
            { text: 'Socket', link: '/java/04-network/chapter-03-socket' },
            { text: 'NIO', link: '/java/04-network/chapter-04-nio' },
            { text: 'Netty', link: '/java/04-network/chapter-05-netty' },
            { text: 'HTTP', link: '/java/04-network/chapter-06-http' },
            { text: 'Servlet 与 Spring MVC', link: '/java/04-network/chapter-07-servlet-springmvc' },
            { text: 'RPC', link: '/java/04-network/chapter-08-rpc' },
            { text: '长连接', link: '/java/04-network/chapter-09-long-connection' },
            { text: '网络诊断', link: '/java/04-network/chapter-10-network-diagnostics' },
          ]
        },
        {
          text: '数据访问',
          items: [
            { text: '持久化思想', link: '/java/05-data-access/chapter-01-persistence-thought' },
            { text: 'JDBC', link: '/java/05-data-access/chapter-02-jdbc' },
            { text: 'MyBatis', link: '/java/05-data-access/chapter-03-mybatis' },
            { text: 'ORM 深入', link: '/java/05-data-access/chapter-04-orm-deep' },
            { text: '数据库原理', link: '/java/05-data-access/chapter-05-db-principles' },
            { text: 'Spring 事务', link: '/java/05-data-access/chapter-06-spring-transaction' },
            { text: '性能优化', link: '/java/05-data-access/chapter-07-performance' },
          ]
        }
      ],
      '/spring/': [
        {
          text: 'Spring',
          items: [
            { text: '核心原理', link: '/spring/chapter-01-spring-core' },
            { text: '容器与 AOP', link: '/spring/chapter-02-container-aop' },
            { text: 'Spring MVC', link: '/spring/chapter-03-spring-mvc' },
            { text: 'Spring Boot', link: '/spring/chapter-04-spring-boot' },
            { text: '数据集成', link: '/spring/chapter-05-data-integration' },
            { text: '微服务', link: '/spring/chapter-06-microservices' },
            { text: '治理', link: '/spring/chapter-07-governance' },
            { text: '安全与部署', link: '/spring/chapter-08-security-deploy' },
            { text: '可观测性', link: '/spring/chapter-09-observability' },
          ]
        }
      ],
      '/redis/': [
        {
          text: '数据模型',
          items: [
            { text: '概览', link: '/redis/01-data-model/chapter-01-overview' },
            { text: '基础类型', link: '/redis/01-data-model/chapter-02-basic-types' },
            { text: '高级类型', link: '/redis/01-data-model/chapter-03-advanced-types' },
            { text: '数据结构', link: '/redis/01-data-model/chapter-04-data-structures' },
            { text: '对象编码', link: '/redis/01-data-model/chapter-05-object-encoding' },
          ]
        },
        {
          text: '单机核心',
          items: [
            { text: '线程模型', link: '/redis/02-standalone-core/chapter-01-thread-model' },
            { text: '命令与 RESP', link: '/redis/02-standalone-core/chapter-02-command-resp' },
            { text: 'RDB', link: '/redis/02-standalone-core/chapter-03-rdb' },
            { text: 'AOF', link: '/redis/02-standalone-core/chapter-04-aof' },
            { text: '过期策略', link: '/redis/02-standalone-core/chapter-05-expiration' },
            { text: '淘汰策略', link: '/redis/02-standalone-core/chapter-06-eviction' },
          ]
        },
        {
          text: '缓存工程',
          items: [
            { text: '穿透', link: '/redis/03-cache-engineering/chapter-01-penetration' },
            { text: '击穿', link: '/redis/03-cache-engineering/chapter-02-breakdown' },
            { text: '雪崩', link: '/redis/03-cache-engineering/chapter-03-avalanche' },
            { text: '一致性', link: '/redis/03-cache-engineering/chapter-04-consistency' },
            { text: '大 Key 与热 Key', link: '/redis/03-cache-engineering/chapter-05-big-hot-key' },
          ]
        },
        {
          text: '高可用',
          items: [
            { text: '主从复制', link: '/redis/04-high-availability/chapter-01-replication' },
            { text: '哨兵', link: '/redis/04-high-availability/chapter-02-sentinel' },
            { text: '集群', link: '/redis/04-high-availability/chapter-03-cluster' },
            { text: '分布式锁', link: '/redis/04-high-availability/chapter-04-distributed-lock' },
            { text: '事务与 Lua', link: '/redis/04-high-availability/chapter-05-transaction-lua' },
            { text: 'Pipeline 与 Pub/Sub', link: '/redis/04-high-availability/chapter-06-pipeline-pubsub' },
          ]
        },
        {
          text: '运维',
          items: [
            { text: '性能', link: '/redis/05-operations/chapter-01-performance' },
            { text: '排障', link: '/redis/05-operations/chapter-02-troubleshooting' },
            { text: '监控', link: '/redis/05-operations/chapter-03-monitoring' },
            { text: '踩坑', link: '/redis/05-operations/chapter-04-pitfalls' },
            { text: '实战项目', link: '/redis/05-operations/chapter-05-hands-on-project' },
          ]
        }
      ],
      '/postgresql/': [
        {
          text: 'PostgreSQL',
          items: [
            { text: '核心特性与选型', link: '/postgresql/00-postgresql-overview' },
            { text: 'PG vs MySQL', link: '/postgresql/01-PG与MySQL对比' },
            { text: 'MVCC 与 VACUUM', link: '/postgresql/02-MVCC与VACUUM机制' },
            { text: '索引类型', link: '/postgresql/03-索引类型详解' },
            { text: '窗口函数', link: '/postgresql/04-窗口函数' },
            { text: 'CTE 与递归查询', link: '/postgresql/05-CTE与递归查询' },
            { text: '物化视图', link: '/postgresql/06-物化视图' },
            { text: '事务与锁', link: '/postgresql/07-事务与锁机制' },
            { text: '性能优化', link: '/postgresql/08-性能优化与调优' },
            { text: 'JSONB', link: '/postgresql/09-JSONB高级用法' },
          ]
        }
      ],
      '/kafka/': [
        {
          text: 'Kafka',
          items: [
            { text: '概览', link: '/kafka/00-kafka-overview' },
            { text: '基础概念', link: '/kafka/01-基础概念' },
            { text: '整体架构', link: '/kafka/02-整体架构' },
            { text: '消息可靠性', link: '/kafka/03-消息可靠性' },
            { text: '消费者组与 Rebalance', link: '/kafka/04-消费者组与Rebalance' },
            { text: '高吞吐原理', link: '/kafka/05-高吞吐原理' },
            { text: '消息队列选型', link: '/kafka/06-消息队列选型' },
            { text: '常见问题', link: '/kafka/07-常见问题与解决' },
            { text: '存储机制', link: '/kafka/08-存储机制与日志设计' },
            { text: '事务消息', link: '/kafka/09-事务消息与ExactlyOnce' },
            { text: 'Controller 与选举', link: '/kafka/10-Controller与Leader选举' },
            { text: 'KRaft', link: '/kafka/11-KRaft模式与去ZooKeeper' },
            { text: '消费语义', link: '/kafka/12-消费语义与位移管理' },
            { text: '分区策略', link: '/kafka/13-生产者分区策略与消息顺序' },
          ]
        }
      ],
      '/elasticsearch/': [
        {
          text: 'Elasticsearch',
          items: [
            { text: '概览', link: '/elasticsearch/00-elasticsearch概览' },
            { text: '引入与背景', link: '/elasticsearch/01-引入与背景' },
            { text: '核心概念', link: '/elasticsearch/02-核心概念' },
            { text: '倒排索引', link: '/elasticsearch/03-倒排索引' },
            { text: 'Mapping 设计', link: '/elasticsearch/04-Mapping映射设计' },
            { text: '查询 DSL', link: '/elasticsearch/05-查询语法DSL' },
            { text: '集群与分片', link: '/elasticsearch/06-集群架构与分片机制' },
            { text: '性能优化', link: '/elasticsearch/07-性能优化' },
            { text: '数据一致性', link: '/elasticsearch/08-数据一致性' },
            { text: '聚合查询', link: '/elasticsearch/09-聚合查询' },
            { text: '分词器', link: '/elasticsearch/10-分词器与中文分词' },
          ]
        }
      ],
      '/design-pattern/': [
        {
          text: '设计模式',
          items: [
            { text: '总览', link: '/design-pattern/00-设计模式总览' },
            { text: '单例', link: '/design-pattern/01-单例模式' },
            { text: '工厂', link: '/design-pattern/02-工厂方法与抽象工厂模式' },
            { text: '建造者', link: '/design-pattern/03-建造者模式' },
            { text: '代理', link: '/design-pattern/04-代理模式' },
            { text: '装饰器', link: '/design-pattern/05-装饰器模式' },
            { text: '适配器', link: '/design-pattern/06-适配器模式' },
            { text: '策略', link: '/design-pattern/07-策略模式' },
            { text: '观察者', link: '/design-pattern/08-观察者模式' },
            { text: '模板方法', link: '/design-pattern/09-模板方法模式' },
            { text: '责任链', link: '/design-pattern/10-责任链模式' },
            { text: '原型', link: '/design-pattern/11-创建型补充-原型模式' },
            { text: '结构型补充', link: '/design-pattern/12-结构型补充-外观桥接组合享元' },
            { text: '行为型补充', link: '/design-pattern/13-行为型补充-命令迭代器中介者等' },
          ]
        }
      ],
      '/engineering/': [
        {
          text: '软件工程',
          items: [
            { text: '概览', link: '/engineering/00-软件工程概览' },
            { text: 'SOLID', link: '/engineering/01-SOLID原则' },
            { text: '架构演进', link: '/engineering/02-软件架构演进' },
            { text: 'DDD', link: '/engineering/03-DDD领域驱动设计' },
            { text: 'CAP 与 BASE', link: '/engineering/04-CAP理论与BASE理论' },
            { text: '代码质量', link: '/engineering/05-代码质量与重构' },
            { text: 'CI/CD', link: '/engineering/06-CICD持续集成与交付' },
            { text: '系统设计', link: '/engineering/07-系统设计方法论' },
          ]
        }
      ],
      '/ai/': [
        {
          text: 'AI 工程',
          items: [
            { text: '概览', link: '/ai/00-AI工程概览' },
            { text: 'LLM 接口与提示词', link: '/ai/01-LLM接口与提示词工程' },
            { text: 'RAG', link: '/ai/02-RAG架构与工程落地' },
            { text: 'Function Calling 与 Agent', link: '/ai/03-FunctionCalling与Agent范式' },
            { text: 'Spring AI 与 MCP', link: '/ai/04-SpringAI入门与MCP集成' },
            { text: 'MCP 协议实战', link: '/ai/05-MCP协议与OpenClawSkill实战' },
          ]
        }
      ]
    },
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/b1tzer/b1tzer.github.io' }
    ],
    
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-2026 b1tzer'
    },
    
    search: {
      provider: 'local'
    }
  }
})
