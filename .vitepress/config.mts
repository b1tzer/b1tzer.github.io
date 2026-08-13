import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'The Stack',
  description: '系统化的 Java 后端技术分析',
  lang: 'zh-CN',
  srcDir: './docs',
  outDir: './site',
  
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
          text: '核心原理',
          items: [
            { text: 'Spring 概览', link: '/spring/01-core/chapter-01-spring-overview' },
            { text: 'IoC 容器', link: '/spring/01-core/chapter-02-ioc-container' },
            { text: '依赖注入', link: '/spring/01-core/chapter-03-dependency-injection' },
            { text: 'Bean 生命周期', link: '/spring/01-core/chapter-04-bean-lifecycle' },
            { text: 'AOP', link: '/spring/01-core/chapter-05-aop' },
            { text: '条件装配与 Profile', link: '/spring/01-core/chapter-06-conditional-profile' },
          ]
        },
        {
          text: 'Web 开发',
          items: [
            { text: 'Spring MVC', link: '/spring/02-web/chapter-01-spring-mvc' },
            { text: 'RESTful API', link: '/spring/02-web/chapter-02-rest-api' },
            { text: '参数校验', link: '/spring/02-web/chapter-03-validation-binding' },
            { text: '拦截器与过滤器', link: '/spring/02-web/chapter-04-interceptor-filter' },
            { text: 'WebFlux', link: '/spring/02-web/chapter-05-webflux' },
          ]
        },
        {
          text: '数据访问',
          items: [
            { text: 'JdbcTemplate', link: '/spring/03-data-access/chapter-01-jdbc-template' },
            { text: 'MyBatis', link: '/spring/03-data-access/chapter-02-mybatis-integration' },
            { text: 'JPA', link: '/spring/03-data-access/chapter-03-jpa' },
            { text: '事务管理', link: '/spring/03-data-access/chapter-04-transaction' },
            { text: '多数据源', link: '/spring/03-data-access/chapter-05-multi-datasource' },
          ]
        },
        {
          text: 'Spring Boot',
          items: [
            { text: '自动配置', link: '/spring/04-spring-boot/chapter-01-autoconfiguration' },
            { text: 'Starter', link: '/spring/04-spring-boot/chapter-02-starter' },
            { text: '外部化配置', link: '/spring/04-spring-boot/chapter-03-configuration' },
            { text: 'Actuator', link: '/spring/04-spring-boot/chapter-04-actuator' },
            { text: 'DevTools', link: '/spring/04-spring-boot/chapter-05-devtools' },
          ]
        },
        {
          text: '安全',
          items: [
            { text: '安全架构', link: '/spring/05-security/chapter-01-security-architecture' },
            { text: '认证机制', link: '/spring/05-security/chapter-02-authentication' },
            { text: '授权模型', link: '/spring/05-security/chapter-03-authorization' },
            { text: '安全实践', link: '/spring/05-security/chapter-04-security-practice' },
          ]
        },
        {
          text: '高级特性',
          items: [
            { text: '事件机制', link: '/spring/06-advanced/chapter-01-event' },
            { text: '异步处理', link: '/spring/06-advanced/chapter-02-async' },
            { text: '定时任务', link: '/spring/06-advanced/chapter-03-scheduling' },
            { text: '缓存', link: '/spring/06-advanced/chapter-04-caching' },
            { text: '消息集成', link: '/spring/06-advanced/chapter-05-messaging' },
            { text: '国际化', link: '/spring/06-advanced/chapter-06-internationalization' },
          ]
        },
        {
          text: '微服务',
          items: [
            { text: '架构模式', link: '/spring/07-microservices/chapter-01-microservice-pattern' },
            { text: '服务发现', link: '/spring/07-microservices/chapter-02-service-discovery' },
            { text: 'API 网关', link: '/spring/07-microservices/chapter-03-api-gateway' },
            { text: '负载均衡', link: '/spring/07-microservices/chapter-04-load-balancing' },
            { text: '熔断降级', link: '/spring/07-microservices/chapter-05-circuit-breaker' },
            { text: '配置中心', link: '/spring/07-microservices/chapter-06-config-center' },
          ]
        },
        {
          text: '测试',
          items: [
            { text: '单元测试', link: '/spring/08-testing/chapter-01-unit-test' },
            { text: '集成测试', link: '/spring/08-testing/chapter-02-integration-test' },
            { text: 'Testcontainers', link: '/spring/08-testing/chapter-03-testcontainers' },
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
          text: '基础入门',
          items: [
            { text: 'PG 概览', link: '/postgresql/01-basics/chapter-01-overview' },
            { text: '安装部署', link: '/postgresql/01-basics/chapter-02-install-config' },
            { text: 'SQL 基础', link: '/postgresql/01-basics/chapter-03-sql-basics' },
            { text: '数据类型', link: '/postgresql/01-basics/chapter-04-data-types' },
            { text: 'PG vs MySQL', link: '/postgresql/01-basics/chapter-05-pg-vs-mysql' },
          ]
        },
        {
          text: 'SQL 进阶',
          items: [
            { text: '窗口函数', link: '/postgresql/02-sql-advanced/chapter-01-window-function' },
            { text: 'CTE 与递归', link: '/postgresql/02-sql-advanced/chapter-02-cte-recursive' },
            { text: '子查询与 LATERAL', link: '/postgresql/02-sql-advanced/chapter-03-subquery-lateral' },
            { text: 'JSONB', link: '/postgresql/02-sql-advanced/chapter-04-jsonb' },
            { text: '全文搜索', link: '/postgresql/02-sql-advanced/chapter-05-full-text-search' },
          ]
        },
        {
          text: '内核原理',
          items: [
            { text: '进程架构', link: '/postgresql/03-internals/chapter-01-architecture' },
            { text: '内存架构', link: '/postgresql/03-internals/chapter-02-memory' },
            { text: '存储架构', link: '/postgresql/03-internals/chapter-03-storage' },
            { text: 'MVCC', link: '/postgresql/03-internals/chapter-04-mvcc' },
            { text: 'VACUUM', link: '/postgresql/03-internals/chapter-05-vacuum' },
            { text: 'WAL', link: '/postgresql/03-internals/chapter-06-wal' },
            { text: '查询处理', link: '/postgresql/03-internals/chapter-07-query-processing' },
          ]
        },
        {
          text: '索引与查询优化',
          items: [
            { text: '索引类型', link: '/postgresql/04-index-optimization/chapter-01-index-types' },
            { text: '索引设计', link: '/postgresql/04-index-optimization/chapter-02-index-design' },
            { text: 'EXPLAIN', link: '/postgresql/04-index-optimization/chapter-03-explain-analyze' },
            { text: '查询优化', link: '/postgresql/04-index-optimization/chapter-04-query-optimization' },
            { text: '表分区', link: '/postgresql/04-index-optimization/chapter-05-partitioning' },
          ]
        },
        {
          text: '事务与并发',
          items: [
            { text: '事务', link: '/postgresql/05-transaction-concurrency/chapter-01-transaction' },
            { text: '锁机制', link: '/postgresql/05-transaction-concurrency/chapter-02-lock' },
            { text: '咨询锁', link: '/postgresql/05-transaction-concurrency/chapter-03-advisory-lock' },
            { text: '并发实践', link: '/postgresql/05-transaction-concurrency/chapter-04-concurrency' },
          ]
        },
        {
          text: '高级特性',
          items: [
            { text: '扩展机制', link: '/postgresql/06-advanced-features/chapter-01-extensions' },
            { text: 'PL/pgSQL', link: '/postgresql/06-advanced-features/chapter-02-plpgsql' },
            { text: 'FDW', link: '/postgresql/06-advanced-features/chapter-03-foreign-data-wrapper' },
            { text: '逻辑复制', link: '/postgresql/06-advanced-features/chapter-04-logical-replication' },
            { text: 'PostGIS', link: '/postgresql/06-advanced-features/chapter-05-postgis' },
            { text: 'LISTEN/NOTIFY', link: '/postgresql/06-advanced-features/chapter-06-notify' },
            { text: '物化视图', link: '/postgresql/06-advanced-features/chapter-07-materialized-view' },
          ]
        },
        {
          text: '运维管理',
          items: [
            { text: '备份恢复', link: '/postgresql/07-operations/chapter-01-backup-restore' },
            { text: '监控', link: '/postgresql/07-operations/chapter-02-monitoring' },
            { text: '安全', link: '/postgresql/07-operations/chapter-03-security' },
            { text: '用户管理', link: '/postgresql/07-operations/chapter-04-user-management' },
            { text: '日常维护', link: '/postgresql/07-operations/chapter-05-maintenance' },
          ]
        },
        {
          text: '高可用与架构',
          items: [
            { text: '流复制', link: '/postgresql/08-ha-architecture/chapter-01-streaming-replication' },
            { text: '高可用方案', link: '/postgresql/08-ha-architecture/chapter-02-ha-solutions' },
            { text: '连接池', link: '/postgresql/08-ha-architecture/chapter-03-connection-pooling' },
            { text: '分片', link: '/postgresql/08-ha-architecture/chapter-04-sharding' },
            { text: '迁移', link: '/postgresql/08-ha-architecture/chapter-05-migration' },
          ]
        },
        {
          text: '实战场景',
          items: [
            { text: 'Spring 集成', link: '/postgresql/09-practice/chapter-01-spring-integration' },
            { text: '性能调优', link: '/postgresql/09-practice/chapter-02-performance-tuning' },
            { text: '常见模式', link: '/postgresql/09-practice/chapter-03-common-patterns' },
          ]
        }
      ],
      '/mysql/': [
        {
          text: '基础入门',
          items: [
            { text: 'MySQL 概览', link: '/mysql/01-basics/chapter-01-overview' },
            { text: '安装部署', link: '/mysql/01-basics/chapter-02-install-config' },
            { text: 'SQL 基础', link: '/mysql/01-basics/chapter-03-sql-basics' },
            { text: '整体架构', link: '/mysql/01-basics/chapter-04-architecture' },
          ]
        },
        {
          text: 'InnoDB 内核',
          items: [
            { text: 'Buffer Pool', link: '/mysql/02-innodb-internals/chapter-01-buffer-pool' },
            { text: '数据页与行格式', link: '/mysql/02-innodb-internals/chapter-02-data-page' },
            { text: '表空间', link: '/mysql/02-innodb-internals/chapter-03-tablespace' },
            { text: 'Redo Log', link: '/mysql/02-innodb-internals/chapter-04-redo-log' },
            { text: 'Undo Log', link: '/mysql/02-innodb-internals/chapter-05-undo-log' },
            { text: 'Binlog', link: '/mysql/02-innodb-internals/chapter-06-binlog' },
          ]
        },
        {
          text: '索引',
          items: [
            { text: 'B+ 树索引', link: '/mysql/03-index/chapter-01-btree-index' },
            { text: '索引设计', link: '/mysql/03-index/chapter-02-index-design' },
            { text: '索引使用', link: '/mysql/03-index/chapter-03-index-usage' },
            { text: '索引优化', link: '/mysql/03-index/chapter-04-index-optimization' },
          ]
        },
        {
          text: '事务与锁',
          items: [
            { text: '事务与 MVCC', link: '/mysql/04-transaction-lock/chapter-01-transaction' },
            { text: '锁机制', link: '/mysql/04-transaction-lock/chapter-02-lock' },
            { text: '死锁', link: '/mysql/04-transaction-lock/chapter-03-deadlock' },
            { text: '乐观锁', link: '/mysql/04-transaction-lock/chapter-04-optimistic-lock' },
          ]
        },
        {
          text: '查询优化',
          items: [
            { text: '查询执行流程', link: '/mysql/05-query-optimization/chapter-01-execution-plan' },
            { text: 'EXPLAIN', link: '/mysql/05-query-optimization/chapter-02-explain' },
            { text: 'SQL 优化', link: '/mysql/05-query-optimization/chapter-03-sql-optimization' },
            { text: '连接优化', link: '/mysql/05-query-optimization/chapter-04-join-optimization' },
            { text: '子查询优化', link: '/mysql/05-query-optimization/chapter-05-subquery-optimization' },
          ]
        },
        {
          text: '高级特性',
          items: [
            { text: '窗口函数', link: '/mysql/06-advanced-features/chapter-01-window-function' },
            { text: 'CTE', link: '/mysql/06-advanced-features/chapter-02-cte' },
            { text: '生成列', link: '/mysql/06-advanced-features/chapter-03-generated-column' },
            { text: 'JSON', link: '/mysql/06-advanced-features/chapter-04-json' },
            { text: '分区表', link: '/mysql/06-advanced-features/chapter-05-partition' },
            { text: 'MySQL 8.0', link: '/mysql/06-advanced-features/chapter-06-mysql8-features' },
          ]
        },
        {
          text: '复制与高可用',
          items: [
            { text: '异步复制', link: '/mysql/07-replication-ha/chapter-01-binlog-replication' },
            { text: 'GTID', link: '/mysql/07-replication-ha/chapter-02-gtid' },
            { text: '组复制', link: '/mysql/07-replication-ha/chapter-03-group-replication' },
            { text: '读写分离', link: '/mysql/07-replication-ha/chapter-04-read-write-split' },
            { text: '高可用方案', link: '/mysql/07-replication-ha/chapter-05-ha-solution' },
          ]
        },
        {
          text: '运维管理',
          items: [
            { text: '备份恢复', link: '/mysql/08-operations/chapter-01-backup-restore' },
            { text: '监控', link: '/mysql/08-operations/chapter-02-monitoring' },
            { text: '安全', link: '/mysql/08-operations/chapter-03-security' },
            { text: '用户管理', link: '/mysql/08-operations/chapter-04-user-management' },
            { text: '日常维护', link: '/mysql/08-operations/chapter-05-maintenance' },
          ]
        },
        {
          text: '扩展架构',
          items: [
            { text: '分库分表', link: '/mysql/09-scaling/chapter-01-sharding' },
            { text: '在线 DDL', link: '/mysql/09-scaling/chapter-02-online-ddl' },
            { text: '数据迁移', link: '/mysql/09-scaling/chapter-03-data-migration' },
            { text: 'NewSQL', link: '/mysql/09-scaling/chapter-04-newsql' },
          ]
        },
        {
          text: '实战场景',
          items: [
            { text: 'Spring 集成', link: '/mysql/10-practice/chapter-01-spring-integration' },
            { text: '常见问题', link: '/mysql/10-practice/chapter-02-common-issues' },
            { text: '性能调优', link: '/mysql/10-practice/chapter-03-performance-tuning' },
          ]
        }
      ],
      '/kafka/': [
        {
          text: '基础入门',
          items: [
            { text: 'Kafka 概览', link: '/kafka/01-basics/chapter-01-overview' },
            { text: '核心术语', link: '/kafka/01-basics/chapter-02-terminology' },
            { text: '整体架构', link: '/kafka/01-basics/chapter-03-architecture' },
            { text: '消息队列选型', link: '/kafka/01-basics/chapter-04-mq-comparison' },
          ]
        },
        {
          text: '生产者',
          items: [
            { text: '生产者 API', link: '/kafka/02-producer/chapter-01-producer-basics' },
            { text: '分区策略', link: '/kafka/02-producer/chapter-02-partition-strategy' },
            { text: 'ACK 与重试', link: '/kafka/02-producer/chapter-03-acks-retries' },
            { text: '批量与压缩', link: '/kafka/02-producer/chapter-04-batch-compression' },
            { text: '事务生产者', link: '/kafka/02-producer/chapter-05-transaction-producer' },
          ]
        },
        {
          text: '消费者',
          items: [
            { text: '消费者 API', link: '/kafka/03-consumer/chapter-01-consumer-basics' },
            { text: '消费者组', link: '/kafka/03-consumer/chapter-02-consumer-group' },
            { text: 'Offset 管理', link: '/kafka/03-consumer/chapter-03-offset-management' },
            { text: 'Rebalance 策略', link: '/kafka/03-consumer/chapter-04-rebalance-strategy' },
            { text: '消费者优化', link: '/kafka/03-consumer/chapter-05-consumer-optimization' },
          ]
        },
        {
          text: '存储原理',
          items: [
            { text: '日志分段', link: '/kafka/04-storage-internals/chapter-01-log-segment' },
            { text: 'Page Cache', link: '/kafka/04-storage-internals/chapter-02-page-cache' },
            { text: '副本机制', link: '/kafka/04-storage-internals/chapter-03-replication' },
            { text: 'Controller', link: '/kafka/04-storage-internals/chapter-04-controller' },
            { text: 'KRaft', link: '/kafka/04-storage-internals/chapter-05-kraft' },
          ]
        },
        {
          text: '可靠性',
          items: [
            { text: 'ACK 机制', link: '/kafka/05-reliability/chapter-01-acks-机制' },
            { text: 'Exactly Once', link: '/kafka/05-reliability/chapter-02-exactly-once' },
            { text: '消息顺序', link: '/kafka/05-reliability/chapter-03-message-ordering' },
            { text: '数据保留', link: '/kafka/05-reliability/chapter-04-data-retention' },
          ]
        },
        {
          text: '流处理',
          items: [
            { text: 'Streams 概览', link: '/kafka/06-streams/chapter-01-streams-basics' },
            { text: '流操作', link: '/kafka/06-streams/chapter-02-stream-operations' },
            { text: '窗口操作', link: '/kafka/06-streams/chapter-03-windowing' },
            { text: '状态存储', link: '/kafka/06-streams/chapter-04-state-store' },
            { text: 'Streams Exactly Once', link: '/kafka/06-streams/chapter-05-exactly-once-streams' },
          ]
        },
        {
          text: 'Connect',
          items: [
            { text: 'Connect 概览', link: '/kafka/07-connect/chapter-01-connect-basics' },
            { text: '连接器配置', link: '/kafka/07-connect/chapter-02-connect-config' },
            { text: '常用插件', link: '/kafka/07-connect/chapter-03-connect-plugins' },
            { text: 'Connect 监控', link: '/kafka/07-connect/chapter-04-connect-monitoring' },
          ]
        },
        {
          text: '运维管理',
          items: [
            { text: '集群管理', link: '/kafka/08-operations/chapter-01-cluster-management' },
            { text: '监控', link: '/kafka/08-operations/chapter-02-monitoring' },
            { text: '安全', link: '/kafka/08-operations/chapter-03-security' },
            { text: '跨集群镜像', link: '/kafka/08-operations/chapter-04-mirror' },
            { text: '常见问题', link: '/kafka/08-operations/chapter-05-troubleshooting' },
          ]
        },
        {
          text: '实战场景',
          items: [
            { text: 'Spring 集成', link: '/kafka/09-practice/chapter-01-spring-integration' },
            { text: '常见场景', link: '/kafka/09-practice/chapter-02-common-patterns' },
            { text: '性能调优', link: '/kafka/09-practice/chapter-03-performance-tuning' },
          ]
        }
            { text: '概览', link: '/kafka/01-basics/chapter-01-overview' },
            { text: '基础概念', link: '/kafka/01-basics/chapter-02-terminology' },
            { text: '整体架构', link: '/kafka/01-basics/chapter-03-architecture' },
            { text: '消息可靠性', link: '/kafka/05-reliability/chapter-01-acks-机制' },
            { text: '消费者组与 Rebalance', link: '/kafka/03-consumer/chapter-02-consumer-group' },
            { text: '高吞吐原理', link: '/kafka/04-storage-internals/chapter-02-page-cache' },
            { text: '消息队列选型', link: '/kafka/01-basics/chapter-04-mq-comparison' },
            { text: '常见问题', link: '/kafka/08-operations/chapter-05-troubleshooting' },
            { text: '存储机制', link: '/kafka/04-storage-internals/chapter-01-log-segment' },
            { text: '事务消息', link: '/kafka/05-reliability/chapter-02-exactly-once' },
            { text: 'Controller 与选举', link: '/kafka/04-storage-internals/chapter-04-controller' },
            { text: 'KRaft', link: '/kafka/04-storage-internals/chapter-05-kraft' },
            { text: '消费语义', link: '/kafka/03-consumer/chapter-03-offset-management' },
            { text: '分区策略', link: '/kafka/02-producer/chapter-02-partition-strategy' },
      ],
      '/elasticsearch/': [
        {
          text: '基础入门',
          items: [
            { text: 'ES 概览', link: '/elasticsearch/01-basics/chapter-01-overview' },
            { text: '安装部署', link: '/elasticsearch/01-basics/chapter-02-install-config' },
            { text: '核心概念', link: '/elasticsearch/01-basics/chapter-03-core-concepts' },
            { text: 'REST API', link: '/elasticsearch/01-basics/chapter-04-rest-api' },
          ]
        },
        {
          text: '索引与映射',
          items: [
            { text: '文档 CRUD', link: '/elasticsearch/02-indexing/chapter-01-document-crud' },
            { text: '映射', link: '/elasticsearch/02-indexing/chapter-02-mapping' },
            { text: '分析器', link: '/elasticsearch/02-indexing/chapter-03-analysis' },
            { text: '中文分词', link: '/elasticsearch/02-indexing/chapter-04-chinese-analysis' },
            { text: '索引管理', link: '/elasticsearch/02-indexing/chapter-05-index-management' },
            { text: '倒排索引', link: '/elasticsearch/02-indexing/chapter-06-inverted-index' },
          ]
        },
        {
          text: '搜索',
          items: [
            { text: 'Query DSL', link: '/elasticsearch/03-search/chapter-01-query-dsl' },
            { text: '全文搜索', link: '/elasticsearch/03-search/chapter-02-full-text-search' },
            { text: '精确查询', link: '/elasticsearch/03-search/chapter-03-term-query' },
            { text: '布尔查询', link: '/elasticsearch/03-search/chapter-04-bool-query' },
            { text: '嵌套查询', link: '/elasticsearch/03-search/chapter-05-joining' },
            { text: '高亮', link: '/elasticsearch/03-search/chapter-06-highlight' },
            { text: '分页', link: '/elasticsearch/03-search/chapter-07-pagination' },
          ]
        },
        {
          text: '聚合',
          items: [
            { text: '指标聚合', link: '/elasticsearch/04-aggregation/chapter-01-metrics-agg' },
            { text: '桶聚合', link: '/elasticsearch/04-aggregation/chapter-02-bucket-agg' },
            { text: '管道聚合', link: '/elasticsearch/04-aggregation/chapter-03-pipeline-agg' },
            { text: '聚合优化', link: '/elasticsearch/04-aggregation/chapter-04-agg-optimization' },
          ]
        },
        {
          text: '分布式原理',
          items: [
            { text: '分布式架构', link: '/elasticsearch/05-distributed-internals/chapter-01-architecture' },
            { text: '分片机制', link: '/elasticsearch/05-distributed-internals/chapter-02-sharding' },
            { text: '副本机制', link: '/elasticsearch/05-distributed-internals/chapter-03-replication' },
            { text: '写入流程', link: '/elasticsearch/05-distributed-internals/chapter-04-write-path' },
            { text: '读取流程', link: '/elasticsearch/05-distributed-internals/chapter-05-read-path' },
            { text: '近实时搜索', link: '/elasticsearch/05-distributed-internals/chapter-06-near-real-time' },
            { text: '数据一致性', link: '/elasticsearch/05-distributed-internals/chapter-07-data-consistency' },
          ]
        },
        {
          text: '数据建模',
          items: [
            { text: '建模原则', link: '/elasticsearch/06-data-modeling/chapter-01-modeling-principles' },
            { text: 'Nested vs Join', link: '/elasticsearch/06-data-modeling/chapter-02-nested-vs-join' },
            { text: '反规范化', link: '/elasticsearch/06-data-modeling/chapter-03-denormalization' },
            { text: '时序数据', link: '/elasticsearch/06-data-modeling/chapter-04-time-series' },
          ]
        },
        {
          text: '运维管理',
          items: [
            { text: '集群管理', link: '/elasticsearch/07-operations/chapter-01-cluster-management' },
            { text: '监控', link: '/elasticsearch/07-operations/chapter-02-monitoring' },
            { text: '备份恢复', link: '/elasticsearch/07-operations/chapter-03-backup-restore' },
            { text: '安全', link: '/elasticsearch/07-operations/chapter-04-security' },
            { text: '版本升级', link: '/elasticsearch/07-operations/chapter-05-upgrade' },
            { text: '常见问题', link: '/elasticsearch/07-operations/chapter-06-troubleshooting' },
          ]
        },
        {
          text: '性能优化',
          items: [
            { text: '索引优化', link: '/elasticsearch/08-performance/chapter-01-index-optimization' },
            { text: '查询优化', link: '/elasticsearch/08-performance/chapter-02-query-optimization' },
            { text: 'JVM 调优', link: '/elasticsearch/08-performance/chapter-03-jvm-tuning' },
            { text: '硬件选型', link: '/elasticsearch/08-performance/chapter-04-hardware' },
          ]
        },
        {
          text: '生态工具',
          items: [
            { text: 'ELK Stack', link: '/elasticsearch/09-ecosystem/chapter-01-elk' },
            { text: 'Beats', link: '/elasticsearch/09-ecosystem/chapter-02-beats' },
            { text: 'APM', link: '/elasticsearch/09-ecosystem/chapter-03-apm' },
            { text: '向量搜索', link: '/elasticsearch/09-ecosystem/chapter-04-vector-search' },
          ]
        },
        {
          text: '实战场景',
          items: [
            { text: 'Spring 集成', link: '/elasticsearch/10-practice/chapter-01-spring-integration' },
            { text: '日志分析', link: '/elasticsearch/10-practice/chapter-02-log-analysis' },
            { text: '搜索引擎', link: '/elasticsearch/10-practice/chapter-03-search-engine' },
            { text: '数据同步', link: '/elasticsearch/10-practice/chapter-04-data-sync' },
          ]
        }
            { text: '概览', link: '/elasticsearch/01-basics/chapter-01-overview' },
            { text: '引入与背景', link: '/elasticsearch/01-basics/chapter-02-intro' },
            { text: '核心概念', link: '/elasticsearch/01-basics/chapter-03-core-concepts' },
            { text: '倒排索引', link: '/elasticsearch/02-indexing/chapter-06-inverted-index' },
            { text: 'Mapping 设计', link: '/elasticsearch/02-indexing/chapter-02-mapping' },
            { text: '查询 DSL', link: '/elasticsearch/03-search/chapter-01-query-dsl' },
            { text: '集群与分片', link: '/elasticsearch/05-distributed-internals/chapter-02-sharding' },
            { text: '性能优化', link: '/elasticsearch/08-performance/chapter-01-index-optimization' },
            { text: '数据一致性', link: '/elasticsearch/05-distributed-internals/chapter-07-data-consistency' },
            { text: '聚合查询', link: '/elasticsearch/04-aggregation/chapter-01-metrics-agg' },
            { text: '分词器', link: '/elasticsearch/02-indexing/chapter-04-chinese-analysis' },
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
