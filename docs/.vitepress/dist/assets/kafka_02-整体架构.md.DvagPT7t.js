import{_ as a,o as n,c as i,a0 as t}from"./chunks/framework.DQOulFGV.js";const o=JSON.parse('{"title":"Kafka 整体架构","description":"","frontmatter":{"doc_id":"kafka-整体架构","title":"Kafka 整体架构"},"headers":[],"relativePath":"kafka/02-整体架构.md","filePath":"kafka/02-整体架构.md"}'),e={name:"kafka/02-整体架构.md"};function l(p,s,r,h,k,E){return n(),i("div",null,[...s[0]||(s[0]=[t(`<h1 id="kafka-整体架构" tabindex="-1">Kafka 整体架构 <a class="header-anchor" href="#kafka-整体架构" aria-label="Permalink to &quot;Kafka 整体架构&quot;">​</a></h1><hr><h2 id="kafka-整体架构图" tabindex="-1">Kafka 整体架构图 <a class="header-anchor" href="#kafka-整体架构图" aria-label="Permalink to &quot;Kafka 整体架构图&quot;">​</a></h2><div class="language-mermaid vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">mermaid</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">flowchart TD</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    subgraph Client_Apps [Java 生产者服务]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        P_App[Producer App Instance]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        P_App --&gt; P0[Producer Thread 0]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        P_App --&gt; P1[Producer Thread 1]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    end</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    subgraph Kafka_Cluster [Kafka Cluster - 副本因子: 2]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        direction TB</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        subgraph Broker_0 [Broker 0]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            T1P0L[&quot;Topic-A P0 (Leader)&quot;]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            T1P2F[&quot;Topic-A P2 (Follower)&quot;]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        end</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        subgraph Broker_1 [Broker 1]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            T1P1L[&quot;Topic-A P1 (Leader)&quot;]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            T1P0F[&quot;Topic-A P0 (Follower)&quot;]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        end</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        subgraph Broker_2 [Broker 2]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            T1P2L[&quot;Topic-A P2 (Leader)&quot;]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            T1P1F[&quot;Topic-A P1 (Follower)&quot;]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        end</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    end</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    subgraph External [集群协调]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        ZK((ZooKeeper / KRaft))</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    end</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    subgraph Consumer_Group_G0 [Java 消费者服务组 - Group G0]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        direction TB</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        subgraph Service_Instance_0 [Service Instance 0]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            C0[Consumer Thread 0]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        end</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        subgraph Service_Instance_1 [Service Instance 1]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            C1[Consumer Thread 1]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            C2[Consumer Thread 2]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        end</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    end</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    %% 生产者流向</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    P0 --&gt;|Key: User_A| T1P0L</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    P1 --&gt;|Key: User_B| T1P1L</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    %% 副本同步 (ISR 机制)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    T1P0L -.-&gt;|Sync| T1P0F</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    T1P1L -.-&gt;|Sync| T1P1F</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    T1P2L -.-&gt;|Sync| T1P2F</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    %% 消费者拉取 (Fetch)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    T1P0L ===&gt;|Fetch| C0</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    T1P1L ===&gt;|Fetch| C1</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    T1P2L ===&gt;|Fetch| C2</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    %% 协调关系</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    ZK --- Broker_0</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    ZK --- Broker_1</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    ZK --- Broker_2</span></span></code></pre></div><blockquote><p><strong>注意</strong>：Kafka 2.8+ 引入 <strong>KRaft 模式</strong>，用内置的 Raft 协议替代 ZooKeeper，Kafka 3.x 已完全支持无 ZooKeeper 部署。</p></blockquote><hr><h2 id="架构核心要点" tabindex="-1">架构核心要点 <a class="header-anchor" href="#架构核心要点" aria-label="Permalink to &quot;架构核心要点&quot;">​</a></h2><table tabindex="0"><thead><tr><th>组件</th><th>职责</th><th>说明</th></tr></thead><tbody><tr><td><strong>Producer</strong></td><td>消息生产者</td><td>将消息写入指定 Topic 的 Partition</td></tr><tr><td><strong>Broker</strong></td><td>Kafka 服务节点</td><td>存储分区数据，处理读写请求</td></tr><tr><td><strong>Topic</strong></td><td>消息主题</td><td>消息的逻辑分类，由多个 Partition 组成</td></tr><tr><td><strong>Partition</strong></td><td>分区</td><td>Topic 的物理分片，是并行度的基本单位</td></tr><tr><td><strong>Leader/Follower</strong></td><td>主副本/从副本</td><td>Leader 处理读写，Follower 同步数据</td></tr><tr><td><strong>Consumer Group</strong></td><td>消费者组</td><td>组内消费者共同消费 Topic，每个分区只被一个消费者消费</td></tr><tr><td><strong>ZooKeeper/KRaft</strong></td><td>元数据管理</td><td>存储集群元数据，负责 Controller 选举</td></tr></tbody></table><hr><h2 id="数据流向" tabindex="-1">数据流向 <a class="header-anchor" href="#数据流向" aria-label="Permalink to &quot;数据流向&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Producer → Broker(Leader Partition) → Follower Partition(副本同步)</span></span>
<span class="line"><span>                                    ↓</span></span>
<span class="line"><span>                              Consumer(拉取消费)</span></span></code></pre></div><ul><li><strong>写入</strong>：Producer 只写 Leader Partition，Follower 异步同步</li><li><strong>消费</strong>：Consumer 从 Leader Partition 拉取数据（Pull 模式）</li><li><strong>副本</strong>：Follower 持续从 Leader 同步，保证高可用</li></ul>`,12)])])}const c=a(e,[["render",l]]);export{o as __pageData,c as default};
