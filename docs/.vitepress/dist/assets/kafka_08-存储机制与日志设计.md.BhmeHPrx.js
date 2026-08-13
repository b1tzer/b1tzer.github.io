import{_ as s,o as n,c as e,a0 as t}from"./chunks/framework.DQOulFGV.js";const k=JSON.parse('{"title":"Kafka 存储机制与日志设计","description":"","frontmatter":{"doc_id":"kafka-存储机制与日志设计","title":"Kafka 存储机制与日志设计"},"headers":[],"relativePath":"kafka/08-存储机制与日志设计.md","filePath":"kafka/08-存储机制与日志设计.md"}'),p={name:"kafka/08-存储机制与日志设计.md"};function i(l,a,o,d,h,r){return n(),e("div",null,[...a[0]||(a[0]=[t(`<h1 id="kafka-存储机制与日志设计" tabindex="-1">Kafka 存储机制与日志设计 <a class="header-anchor" href="#kafka-存储机制与日志设计" aria-label="Permalink to &quot;Kafka 存储机制与日志设计&quot;">​</a></h1><hr><h2 id="_1-为什么要理解存储机制" tabindex="-1">1. 为什么要理解存储机制？ <a class="header-anchor" href="#_1-为什么要理解存储机制" aria-label="Permalink to &quot;1. 为什么要理解存储机制？&quot;">​</a></h2><p>Kafka 能做到高吞吐、低延迟，根本原因在于其存储设计。理解存储机制，才能回答：</p><ul><li>为什么 Kafka 消费历史消息比 RabbitMQ 快？</li><li>为什么磁盘存储反而比内存队列更快？</li><li>消息保留多久？磁盘满了怎么办？</li></ul><hr><h2 id="_2-日志文件结构" tabindex="-1">2. 日志文件结构 <a class="header-anchor" href="#_2-日志文件结构" aria-label="Permalink to &quot;2. 日志文件结构&quot;">​</a></h2><p>每个 Partition 对应磁盘上的一个目录，目录内由多个 <strong>Log Segment（日志段）</strong> 组成：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>/kafka-logs/order-created-0/          ← Partition 目录（Topic名-分区号）</span></span>
<span class="line"><span>    ├── 00000000000000000000.log       ← 消息数据文件</span></span>
<span class="line"><span>    ├── 00000000000000000000.index     ← 偏移量索引文件</span></span>
<span class="line"><span>    ├── 00000000000000000000.timeindex ← 时间戳索引文件</span></span>
<span class="line"><span>    ├── 00000000000000500000.log       ← 第二个 Segment（从 offset=500000 开始）</span></span>
<span class="line"><span>    ├── 00000000000000500000.index</span></span>
<span class="line"><span>    └── 00000000000000500000.timeindex</span></span></code></pre></div><p><strong>文件名含义</strong>：文件名就是该 Segment 的<strong>起始 offset</strong>，用 20 位数字表示。</p><table tabindex="0"><thead><tr><th>文件类型</th><th>作用</th></tr></thead><tbody><tr><td><code>.log</code></td><td>实际消息数据，顺序追加写入</td></tr><tr><td><code>.index</code></td><td>稀疏偏移量索引，记录 offset → 文件物理位置的映射</td></tr><tr><td><code>.timeindex</code></td><td>时间戳索引，支持按时间查找消息</td></tr></tbody></table><hr><h2 id="_3-稀疏索引原理" tabindex="-1">3. 稀疏索引原理 <a class="header-anchor" href="#_3-稀疏索引原理" aria-label="Permalink to &quot;3. 稀疏索引原理&quot;">​</a></h2><p>Kafka 的索引是<strong>稀疏索引</strong>，不是每条消息都建索引，而是每隔一定字节数（<code>index.interval.bytes</code>，默认 4KB）建一条索引。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>.index 文件内容（示意）：</span></span>
<span class="line"><span>┌──────────────────────────────────────┐</span></span>
<span class="line"><span>│ offset=0      → 文件位置 0           │</span></span>
<span class="line"><span>│ offset=100    → 文件位置 4096        │</span></span>
<span class="line"><span>│ offset=200    → 文件位置 8192        │</span></span>
<span class="line"><span>│ ...                                  │</span></span>
<span class="line"><span>└──────────────────────────────────────┘</span></span>
<span class="line"><span></span></span>
<span class="line"><span>查找 offset=150 的消息：</span></span>
<span class="line"><span>1. 二分查找 .index，找到最近的索引项：offset=100 → 位置 4096</span></span>
<span class="line"><span>2. 从 .log 文件的 4096 位置顺序扫描，直到找到 offset=150</span></span></code></pre></div><p><strong>为什么用稀疏索引而不是全量索引？</strong></p><table tabindex="0"><thead><tr><th>对比</th><th>全量索引</th><th>稀疏索引</th></tr></thead><tbody><tr><td>查找速度</td><td>O(1)</td><td>O(log n) + 少量顺序扫描</td></tr><tr><td>索引文件大小</td><td>与消息数量成正比（很大）</td><td>固定小（可全部加载进内存）</td></tr><tr><td>内存占用</td><td>高</td><td>低</td></tr></tbody></table><blockquote><p><strong>结论</strong>：稀疏索引牺牲了极少量查找性能，换来了索引文件可以常驻内存，整体查找效率反而更高。</p></blockquote><hr><h2 id="_4-pagecache-的利用" tabindex="-1">4. PageCache 的利用 <a class="header-anchor" href="#_4-pagecache-的利用" aria-label="Permalink to &quot;4. PageCache 的利用&quot;">​</a></h2><p>Kafka 不自己管理内存缓存，而是<strong>完全依赖操作系统的 PageCache</strong>：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>写入流程：</span></span>
<span class="line"><span>Producer → Kafka Broker → PageCache（内存）→ 磁盘（异步刷盘）</span></span>
<span class="line"><span></span></span>
<span class="line"><span>读取流程（消费者消费最新消息）：</span></span>
<span class="line"><span>Consumer → Kafka Broker → PageCache（直接命中，不读磁盘）→ 网卡（零拷贝）</span></span></code></pre></div><p><strong>为什么不自己管理内存？</strong></p><ol><li><strong>JVM GC 问题</strong>：如果 Kafka 用 JVM 堆内存缓存消息，大量对象会触发 Full GC，导致停顿</li><li><strong>重启恢复</strong>：PageCache 由 OS 管理，Kafka 重启后 PageCache 仍然存在，不需要预热</li><li><strong>零拷贝配合</strong>：<code>sendfile</code> 系统调用直接将 PageCache 中的数据发送到网卡，无需经过用户态</li></ol><hr><h2 id="_5-消息格式演进-message-format" tabindex="-1">5. 消息格式演进（Message Format） <a class="header-anchor" href="#_5-消息格式演进-message-format" aria-label="Permalink to &quot;5. 消息格式演进（Message Format）&quot;">​</a></h2><p>Kafka 消息格式经历了三个版本：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>V0（Kafka 0.10 之前）：</span></span>
<span class="line"><span>┌────────┬──────┬────────┬─────┬───────┐</span></span>
<span class="line"><span>│ Offset │ Size │ CRC32  │ Key │ Value │</span></span>
<span class="line"><span>└────────┴──────┴────────┴─────┴───────┘</span></span>
<span class="line"><span>问题：不支持时间戳，不支持批量压缩</span></span>
<span class="line"><span></span></span>
<span class="line"><span>V1（Kafka 0.10）：</span></span>
<span class="line"><span>┌────────┬──────┬────────┬───────────┬─────┬───────┐</span></span>
<span class="line"><span>│ Offset │ Size │ CRC32  │ Timestamp │ Key │ Value │</span></span>
<span class="line"><span>└────────┴──────┴────────┴───────────┴─────┴───────┘</span></span>
<span class="line"><span>问题：每条消息单独压缩，效率低</span></span>
<span class="line"><span></span></span>
<span class="line"><span>V2（Kafka 0.11+，RecordBatch）：</span></span>
<span class="line"><span>┌─────────────────────────────────────────────────────┐</span></span>
<span class="line"><span>│ RecordBatch Header（批次头，包含压缩、时间戳等元数据）  │</span></span>
<span class="line"><span>├─────────────────────────────────────────────────────┤</span></span>
<span class="line"><span>│ Record 1（使用 Varint 变长编码，节省空间）             │</span></span>
<span class="line"><span>│ Record 2                                            │</span></span>
<span class="line"><span>│ Record N                                            │</span></span>
<span class="line"><span>└─────────────────────────────────────────────────────┘</span></span>
<span class="line"><span>优势：批次级别压缩，空间利用率更高；支持事务；使用 Varint 减少空间占用</span></span></code></pre></div><hr><h2 id="_6-日志清理策略" tabindex="-1">6. 日志清理策略 <a class="header-anchor" href="#_6-日志清理策略" aria-label="Permalink to &quot;6. 日志清理策略&quot;">​</a></h2><p>Kafka 支持两种日志清理策略，通过 <code>log.cleanup.policy</code> 配置：</p><h3 id="_6-1-delete-按时间-大小删除" tabindex="-1">6.1 delete（按时间/大小删除） <a class="header-anchor" href="#_6-1-delete-按时间-大小删除" aria-label="Permalink to &quot;6.1 delete（按时间/大小删除）&quot;">​</a></h3><div class="language-properties vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">properties</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 消息保留时间（默认 7 天）</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">log.retention.hours</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">=168</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 消息保留大小（默认 -1，不限制）</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">log.retention.bytes</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">=-1</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 单个 Segment 文件大小上限（默认 1GB，超过则滚动新 Segment）</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">log.segment.bytes</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">=1073741824</span></span></code></pre></div><p><strong>删除流程</strong>：后台线程定期扫描，将超过保留时间或大小的 Segment 整体删除（不是逐条删除）。</p><h3 id="_6-2-compact-日志压缩-保留最新值" tabindex="-1">6.2 compact（日志压缩，保留最新值） <a class="header-anchor" href="#_6-2-compact-日志压缩-保留最新值" aria-label="Permalink to &quot;6.2 compact（日志压缩，保留最新值）&quot;">​</a></h3><p>适用于<strong>需要保留每个 Key 最新状态</strong>的场景（如数据库变更日志、配置中心）：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>压缩前：</span></span>
<span class="line"><span>Key=user1, Value={&quot;name&quot;:&quot;Alice&quot;}   offset=0</span></span>
<span class="line"><span>Key=user2, Value={&quot;name&quot;:&quot;Bob&quot;}     offset=1</span></span>
<span class="line"><span>Key=user1, Value={&quot;name&quot;:&quot;Alice2&quot;}  offset=2  ← user1 的新值</span></span>
<span class="line"><span>Key=user1, Value=null               offset=3  ← 墓碑消息，表示删除</span></span>
<span class="line"><span></span></span>
<span class="line"><span>压缩后：</span></span>
<span class="line"><span>Key=user2, Value={&quot;name&quot;:&quot;Bob&quot;}     offset=1  ← 保留</span></span>
<span class="line"><span>Key=user1, Value=null               offset=3  ← 保留墓碑消息（一段时间后删除）</span></span></code></pre></div><blockquote><p><strong>墓碑消息（Tombstone）</strong>：Value 为 null 的消息，表示该 Key 已被删除。压缩时会保留一段时间（<code>delete.retention.ms</code>），让消费者有机会感知到删除事件。</p></blockquote><hr><h2 id="_7-log-segment-滚动时机" tabindex="-1">7. Log Segment 滚动时机 <a class="header-anchor" href="#_7-log-segment-滚动时机" aria-label="Permalink to &quot;7. Log Segment 滚动时机&quot;">​</a></h2><p>新 Segment 在以下任一条件满足时创建：</p><table tabindex="0"><thead><tr><th>条件</th><th>配置参数</th><th>默认值</th></tr></thead><tbody><tr><td>Segment 文件大小超过阈值</td><td><code>log.segment.bytes</code></td><td>1 GB</td></tr><tr><td>Segment 存在时间超过阈值</td><td><code>log.roll.hours</code></td><td>168 小时（7天）</td></tr><tr><td>索引文件满</td><td><code>log.index.size.max.bytes</code></td><td>10 MB</td></tr></tbody></table><hr><h2 id="_8-存储设计总结" tabindex="-1">8. 存储设计总结 <a class="header-anchor" href="#_8-存储设计总结" aria-label="Permalink to &quot;8. 存储设计总结&quot;">​</a></h2><div class="language-mermaid vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">mermaid</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">mindmap</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    root((Kafka 存储设计))</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        Log Segment 分段</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            文件名 = 起始 offset</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            .log 数据文件</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            .index 稀疏索引</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            .timeindex 时间索引</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        PageCache</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            不用 JVM 堆内存</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            重启后缓存仍在</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            配合零拷贝</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        消息格式 V2</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            RecordBatch 批次压缩</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            Varint 变长编码</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            支持事务</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        日志清理</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            delete 按时间/大小</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            compact 保留最新值</span></span></code></pre></div><table tabindex="0"><thead><tr><th>设计决策</th><th>原因</th></tr></thead><tbody><tr><td>分段存储（Segment）</td><td>便于按时间/大小删除，避免操作单个超大文件</td></tr><tr><td>稀疏索引</td><td>索引文件小，可常驻内存，查找效率高</td></tr><tr><td>依赖 PageCache</td><td>避免 JVM GC，重启不需要预热，配合零拷贝</td></tr><tr><td>顺序追加写</td><td>磁盘顺序写速度接近内存，避免随机 IO</td></tr></tbody></table>`,46)])])}const g=s(p,[["render",i]]);export{k as __pageData,g as default};
