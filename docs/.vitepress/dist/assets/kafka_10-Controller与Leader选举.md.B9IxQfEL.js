import{_ as s,o as n,c as e,a0 as t}from"./chunks/framework.DQOulFGV.js";const k=JSON.parse('{"title":"Kafka Controller 与 Leader 选举机制","description":"","frontmatter":{"doc_id":"kafka-Controller与Leader选举","title":"Kafka Controller 与 Leader 选举机制"},"headers":[],"relativePath":"kafka/10-Controller与Leader选举.md","filePath":"kafka/10-Controller与Leader选举.md"}'),l={name:"kafka/10-Controller与Leader选举.md"};function i(p,a,r,o,d,h){return n(),e("div",null,[...a[0]||(a[0]=[t(`<h1 id="kafka-controller-与-leader-选举机制" tabindex="-1">Kafka Controller 与 Leader 选举机制 <a class="header-anchor" href="#kafka-controller-与-leader-选举机制" aria-label="Permalink to &quot;Kafka Controller 与 Leader 选举机制&quot;">​</a></h1><hr><h2 id="_1-什么是-controller" tabindex="-1">1. 什么是 Controller？ <a class="header-anchor" href="#_1-什么是-controller" aria-label="Permalink to &quot;1. 什么是 Controller？&quot;">​</a></h2><p>Kafka 集群中有多个 Broker，但只有一个 Broker 会被选为 <strong>Controller（控制器）</strong>。</p><p>Controller 负责整个集群的<strong>元数据管理和协调工作</strong>：</p><table tabindex="0"><thead><tr><th>Controller 职责</th><th>说明</th></tr></thead><tbody><tr><td><strong>Partition Leader 选举</strong></td><td>当 Leader 宕机时，从 ISR 中选出新 Leader</td></tr><tr><td><strong>Broker 上下线感知</strong></td><td>监听 Broker 的加入和退出</td></tr><tr><td><strong>Topic 管理</strong></td><td>处理 Topic 创建、删除、分区扩容</td></tr><tr><td><strong>副本状态机管理</strong></td><td>维护所有副本的状态（Online/Offline/NewReplica 等）</td></tr></tbody></table><hr><h2 id="_2-controller-选举-zookeeper-模式" tabindex="-1">2. Controller 选举（ZooKeeper 模式） <a class="header-anchor" href="#_2-controller-选举-zookeeper-模式" aria-label="Permalink to &quot;2. Controller 选举（ZooKeeper 模式）&quot;">​</a></h2><div class="language-mermaid vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">mermaid</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">sequenceDiagram</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    participant B1 as Broker 1</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    participant B2 as Broker 2</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    participant B3 as Broker 3</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    participant ZK as ZooKeeper</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    B1-&gt;&gt;ZK: 尝试创建 /controller 临时节点（写入自己的 Broker ID）</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    B2-&gt;&gt;ZK: 尝试创建 /controller 临时节点</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    B3-&gt;&gt;ZK: 尝试创建 /controller 临时节点</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    ZK--&gt;&gt;B1: 创建成功（B1 成为 Controller）</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    ZK--&gt;&gt;B2: 节点已存在，失败</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    ZK--&gt;&gt;B3: 节点已存在，失败</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    B2-&gt;&gt;ZK: 监听 /controller 节点变化</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    B3-&gt;&gt;ZK: 监听 /controller 节点变化</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    Note over B1: B1 宕机，/controller 临时节点自动删除</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    ZK--&gt;&gt;B2: 通知节点删除</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    ZK--&gt;&gt;B3: 通知节点删除</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    B2-&gt;&gt;ZK: 抢先创建 /controller 节点（B2 成为新 Controller）</span></span></code></pre></div><p><strong>关键点</strong>：</p><ul><li>ZooKeeper 临时节点（Ephemeral Node）在会话断开时自动删除，天然实现了 Controller 宕机检测</li><li>多个 Broker 同时抢注，ZooKeeper 保证只有一个成功（分布式锁）</li></ul><hr><h2 id="_3-controller-选举-kraft-模式" tabindex="-1">3. Controller 选举（KRaft 模式） <a class="header-anchor" href="#_3-controller-选举-kraft-模式" aria-label="Permalink to &quot;3. Controller 选举（KRaft 模式）&quot;">​</a></h2><p>Kafka 3.x 引入 KRaft 模式，用内置 Raft 协议替代 ZooKeeper：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>KRaft 集群角色：</span></span>
<span class="line"><span>- Controller 节点：专门负责元数据管理（可以与 Broker 合并部署）</span></span>
<span class="line"><span>- Broker 节点：负责数据存储和读写</span></span>
<span class="line"><span></span></span>
<span class="line"><span>Controller 选举流程（Raft）：</span></span>
<span class="line"><span>1. 每个 Controller 节点有一个 epoch（任期号）</span></span>
<span class="line"><span>2. 节点发现 Leader 失联后，增加 epoch，向其他节点发起投票请求</span></span>
<span class="line"><span>3. 获得多数票（&gt;N/2）的节点成为新 Leader（Controller）</span></span>
<span class="line"><span>4. 新 Controller 同步最新的元数据日志，然后开始工作</span></span></code></pre></div><hr><h2 id="_4-partition-leader-选举" tabindex="-1">4. Partition Leader 选举 <a class="header-anchor" href="#_4-partition-leader-选举" aria-label="Permalink to &quot;4. Partition Leader 选举&quot;">​</a></h2><p>当某个 Partition 的 Leader 宕机时，Controller 负责从 <strong>ISR（In-Sync Replicas）</strong> 中选出新 Leader：</p><div class="language-mermaid vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">mermaid</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">flowchart TD</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    A[&quot;Partition Leader 宕机&quot;] --&gt; B[&quot;Controller 感知（ZooKeeper Watch / KRaft）&quot;]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    B --&gt; C{&quot;ISR 列表是否为空？&quot;}</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    C --&gt;|不为空| D[&quot;从 ISR 中选第一个副本作为新 Leader&quot;]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    C --&gt;|为空| E{&quot;unclean.leader.election.enable?&quot;}</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    E --&gt;|true| F[&quot;从 OSR（非同步副本）中选 Leader&lt;br&gt;⚠️ 可能丢消息&quot;]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    E --&gt;|false| G[&quot;分区不可用，等待 ISR 副本恢复&quot;]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    D --&gt; H[&quot;Controller 通知所有 Broker 更新元数据&quot;]</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    F --&gt; H</span></span></code></pre></div><p><strong>ISR（In-Sync Replicas）</strong>：与 Leader 保持同步的副本集合。判断标准：</p><div class="language-properties vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">properties</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># Follower 落后 Leader 的最大时间（超过则踢出 ISR）</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">replica.lag.time.max.ms</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">=30000</span></span></code></pre></div><hr><h2 id="_5-isr-收缩与扩张" tabindex="-1">5. ISR 收缩与扩张 <a class="header-anchor" href="#_5-isr-收缩与扩张" aria-label="Permalink to &quot;5. ISR 收缩与扩张&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ISR 收缩（Follower 被踢出 ISR）：</span></span>
<span class="line"><span>Follower 超过 replica.lag.time.max.ms 未向 Leader 发送 Fetch 请求</span></span>
<span class="line"><span>→ Leader 将其从 ISR 中移除</span></span>
<span class="line"><span>→ 通知 Controller 更新 ISR 列表</span></span>
<span class="line"><span></span></span>
<span class="line"><span>ISR 扩张（Follower 重新加入 ISR）：</span></span>
<span class="line"><span>Follower 恢复后，持续从 Leader 同步数据</span></span>
<span class="line"><span>→ 追上 Leader 的 LEO（Log End Offset）</span></span>
<span class="line"><span>→ Leader 将其重新加入 ISR</span></span></code></pre></div><table tabindex="0"><thead><tr><th>术语</th><th>全称</th><th>含义</th></tr></thead><tbody><tr><td><strong>LEO</strong></td><td>Log End Offset</td><td>分区日志的下一条消息的 offset（最新写入位置）</td></tr><tr><td><strong>HW</strong></td><td>High Watermark</td><td>所有 ISR 副本都已同步的最大 offset，消费者只能消费到 HW</td></tr><tr><td><strong>ISR</strong></td><td>In-Sync Replicas</td><td>与 Leader 保持同步的副本集合</td></tr><tr><td><strong>OSR</strong></td><td>Out-of-Sync Replicas</td><td>落后于 Leader 的副本集合</td></tr></tbody></table><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>HW 的作用（消费者可见性）：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>Leader LEO:    0  1  2  3  4  5  ← 已写入 6 条消息</span></span>
<span class="line"><span>Follower1 LEO: 0  1  2  3  4     ← 同步到 offset=4</span></span>
<span class="line"><span>Follower2 LEO: 0  1  2  3        ← 同步到 offset=3</span></span>
<span class="line"><span></span></span>
<span class="line"><span>HW = min(所有 ISR 的 LEO) = 3</span></span>
<span class="line"><span>消费者只能消费到 offset=3，offset=4、5 对消费者不可见</span></span>
<span class="line"><span></span></span>
<span class="line"><span>为什么这样设计：防止消费者消费了 Leader 上的消息，但 Leader 宕机后</span></span>
<span class="line"><span>新 Leader 没有这条消息，导致消费到&quot;幻影消息&quot;</span></span></code></pre></div><hr><h2 id="_6-unclean-leader-election-enable-的权衡" tabindex="-1">6. unclean.leader.election.enable 的权衡 <a class="header-anchor" href="#_6-unclean-leader-election-enable-的权衡" aria-label="Permalink to &quot;6. unclean.leader.election.enable 的权衡&quot;">​</a></h2><table tabindex="0"><thead><tr><th>配置</th><th>行为</th><th>优点</th><th>缺点</th></tr></thead><tbody><tr><td><code>false</code>（默认，推荐）</td><td>ISR 为空时分区不可用</td><td>不丢消息，数据一致性强</td><td>分区暂时不可用</td></tr><tr><td><code>true</code></td><td>ISR 为空时从 OSR 选 Leader</td><td>分区持续可用</td><td>可能丢失未同步的消息</td></tr></tbody></table><blockquote><p><strong>生产建议</strong>：金融、订单等核心业务保持 <code>false</code>；日志收集等允许少量丢失的场景可设为 <code>true</code>。</p></blockquote><hr><h2 id="_7-controller-脑裂问题" tabindex="-1">7. Controller 脑裂问题 <a class="header-anchor" href="#_7-controller-脑裂问题" aria-label="Permalink to &quot;7. Controller 脑裂问题&quot;">​</a></h2><p><strong>脑裂（Split Brain）</strong>：网络分区导致出现两个 Controller 同时工作。</p><p><strong>ZooKeeper 模式的解决方案</strong>：Controller Epoch（纪元号）</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>每次 Controller 选举，epoch 加 1</span></span>
<span class="line"><span>Broker 收到 Controller 的请求时，检查 epoch：</span></span>
<span class="line"><span>- 请求的 epoch = 当前 epoch → 合法请求，执行</span></span>
<span class="line"><span>- 请求的 epoch &lt; 当前 epoch → 旧 Controller 的请求，忽略</span></span></code></pre></div><hr><h2 id="_8-总结" tabindex="-1">8. 总结 <a class="header-anchor" href="#_8-总结" aria-label="Permalink to &quot;8. 总结&quot;">​</a></h2><div class="language-mermaid vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">mermaid</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">mindmap</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    root((Controller 机制))</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        Controller 选举</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            ZooKeeper 抢注临时节点</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            KRaft Raft 协议投票</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        Partition Leader 选举</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            从 ISR 中选第一个</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            ISR 为空时的权衡</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        ISR 管理</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            收缩：落后超时踢出</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            扩张：追上 LEO 加入</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            HW 保证消费者可见性</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        脑裂防护</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            Controller Epoch</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">            忽略旧 epoch 请求</span></span></code></pre></div>`,38)])])}const E=s(l,[["render",i]]);export{k as __pageData,E as default};
