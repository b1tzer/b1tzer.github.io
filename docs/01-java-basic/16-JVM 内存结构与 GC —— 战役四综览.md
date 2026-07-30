---
doc_id: java-JVM-内存结构与GC
title: JVM 内存结构与 GC —— 战役四综览：内存分区 / GC 机制 / 调优实战 / 现代实践 四子专题导航
---

# JVM 内存结构与 GC —— 战役四综览

!!! info "**JVM 综览一句话口诀**"
    - **JVM 四大件缺一不可**：**内存分区**（知道对象在哪）、**GC 机制**（知道垃圾怎么找）、**调优实战**（知道参数怎么配）、**现代实践**（知道容器 / 虚拟线程 / 前沿趋势）——少了任何一件，线上排障就得靠猜。
    - **JVM 内存结构 ≠ 运行时数据区**：**JVM 整体架构 = 类加载子系统 + 运行时数据区 + 执行引擎 + JNI**；"运行时数据区"（堆 / 栈 / 元空间 / PC / 直接内存）**只是 JVM 架构的一个子系统**。老手很容易把两者混为一谈，导致解释 JIT / Code Cache / GC 子系统时找不到定位。
    - **战役四 5 篇文档定位分工清晰**：`12` 综览（本文，知识地图） · `12a` 内存分区与对象布局（Mark Word 首发） · `12b` GC 核心机制与收集器演进（三色标记 + 5 代收集器） · `12c` GC 调优实战与常见误区（OOM 四字诀 + 参数矩阵） · `12d` JVM 现代实践与前沿技术（容器化 + 虚拟线程 + 分代 ZGC + Valhalla）。**本文不重复姊妹文档的细节，只做导航**。
    - **本文与 `00 Java 综览页` 的分工**：`00` 是**整个 Java 专题的战役全景图**（涵盖字节码 / 集合 / 并发 / JVM / NIO 五大战役）；`12` 是**战役四内部的子专题导航**（只覆盖 JVM 5 篇）。两个综览是"总览 → 局部"的两级关系，**不重复架构描述**。

> 📖 **边界声明**：本文严格承担"知识地图 + 导航索引"职责，以下深度机制请见对应姊妹文档：
>
> - 堆 / 栈 / 元空间 / 对象头 Mark Word 位分布 / 压缩指针 → [JVM 内存分区与对象布局](@java-JVM-内存分区与对象布局) §1~§5
> - 可达性分析 GC Roots / 三色标记 / 写屏障 / SATB / 逃逸分析 / Safepoint → [GC 核心机制与收集器演进](@java-JVM-GC核心机制与收集器演进) §2~§7
> - Serial / Parallel / CMS / G1 / ZGC / 分代 ZGC 完整演进链 + 参数对比 → [GC 核心机制与收集器演进](@java-JVM-GC核心机制与收集器演进) §8~§10
> - 调优方法论 / GC 日志分析 / OOM 四字诀 / 生产 checklist → [GC 调优实战与常见误区](@java-JVM-GC调优实战与常见误区) §1~§7
> - 容器化 JVM / 虚拟线程 Loom / JFR / async-profiler / CRaC / Valhalla / Panama → [JVM 现代实践与前沿技术](@java-JVM-现代实践与前沿技术) §1~§7
> - 类加载子系统五阶段 + 双亲委派模型 → [类加载机制与双亲委派模型](@java-JVM-类加载机制与双亲委派模型)（战役四序章，独立成篇）
> - JMM 与 `synchronized` 锁升级时 Mark Word 状态位跃迁 → [JMM 与线程同步](@java-并发-JMM与线程同步) §4（属于战役三，非本战役内容）

---

## 1. 为什么要深入理解 JVM？

Java 程序运行在 JVM 之上，JVM 屏蔽了底层操作系统的差异，但也带来了一层"黑盒"。当系统出现以下问题时，不理解 JVM 就无从下手：

| 现象 | 根因 | 需要的 JVM 知识 |
| :---- | :---- | :---- |
| `OutOfMemoryError` 崩溃 | 内存泄漏 / 堆太小 | 内存分区 + OOM 排查 |
| 每隔几分钟停顿几秒 | 频繁 Full GC | GC 算法 + 收集器选型 |
| CPU 100% 但业务量不高 | GC 线程占满 CPU | GC 日志分析 + 调优 |
| 响应时间 P99 抖动 | Stop-The-World 停顿 | 低延迟收集器（ZGC / G1） |
| 类加载后内存持续增长 | 元空间泄漏 | 元空间 + 类加载机制 |
| 容器里被 OOM Killer 杀 | JVM 不感知 cgroup | 容器化 JVM 调优 |

---

## 2. JVM 整体架构

JVM 是一个完整的运行时系统，除了内存区域外，还包括**类加载子系统、执行引擎、GC 子系统**等组件。下图从整体架构视角呈现各组件的关系。

```kroki-plantuml
@startuml

' ========= 顶部：输入 =========
rectangle "*.class 文件 / JAR" as ClassFile #E6FFFA

' ========= 中部：JVM 进程 =========
package "JVM 进程" as JVM {

  package "类加载子系统 ClassLoader" as Loader {
    rectangle "加载 / 链接 / 初始化" as CL
  }

  package "运行时数据区 Runtime Data Area\n（即常说的 JVM 内存结构）" as Runtime {

    package "线程共享" as Shared {
      rectangle "堆 Heap\n新生代(Eden+S0+S1) + 老年代" as Heap
      rectangle "元空间 MetaSpace\n类元数据 / 方法信息 / 常量池\n（本地内存）" as Meta
      rectangle "Code Cache\n存放 JIT 产出的机器码\n（本地内存）" as CodeCache
    }

    package "线程私有（每个线程独有）" as Private {
      rectangle "虚拟机栈\n栈帧 = 局部变量表 + 操作数栈\n + 动态链接 + 返回地址" as Stack
      rectangle "本地方法栈\nNative 方法" as NStack
      rectangle "程序计数器\n当前字节码指令地址" as PC
    }
  }

  package "执行引擎 Execution Engine" as Engine {
    rectangle "解释器\n逐条执行字节码" as Interp
    rectangle "JIT 编译器 C1/C2\n热点代码 → 机器码" as JIT
    rectangle "GC 子系统\nMinor / Major / Full GC" as GC
  }

  rectangle "本地接口 JNI" as JNI
}

' ========= 底部：底层资源 =========
rectangle "直接内存 Direct Memory\nNIO ByteBuffer / Netty\n不受 JVM 堆管理" as DirectMem #FFF5F5
rectangle "操作系统 / 物理内存" as OS #FEFCBF

' ========= 连线 =========
ClassFile --> CL
CL --> Meta : 写入类元数据
Interp ..> JIT : 热点方法触发编译
JIT --> CodeCache : 产出机器码写入
Engine --> Heap : 操作对象
Engine --> Stack : 方法调用
Heap <--> GC
NStack <--> JNI
Meta --> OS
CodeCache --> OS
Heap --> OS
DirectMem --> OS

@enduml
```

**架构层次说明**：

- JVM 整体架构涵盖类加载、运行时数据区、执行引擎、本地接口四大子系统；
- "运行时数据区"即通常所说的 **JVM 内存结构**，其细节见 [JVM 内存分区与对象布局](@java-JVM-内存分区与对象布局)（堆 / 栈 / 元空间 / PC / 直接内存）；
- 执行引擎本身不是内存区域，但它是产生 Code Cache 机器码、触发 GC 的主体；
- **JIT 编译器（C1/C2/Graal）** 是 JVM 执行引擎的一个子系统，职责是**把字节码翻译成机器码**；
- **Code Cache** 是存放编译产物（机器码）的地方，位于本地内存，由 `-XX:ReservedCodeCacheSize` 控制大小（默认 240MB）。Code Cache 满了会触发"CodeCache is full"告警，JIT 停止编译，程序退化为纯解释执行，性能会明显下降。

### 2.1 老手最容易踩空的三条架构常识（💡 顿悟点）

综览型页面唯一允许承担的"稀缺物理常识"就是下面这三条——它们不属于任何一篇姊妹文档的核心机制章节，但每一条都决定了老手在读姊妹文档时能否**站对定位**：

1. **JVM 整体架构 ≠ 运行时数据区**："内存结构"只是 4 大子系统之一。把 JIT / Code Cache / GC 子系统全部塞进"内存结构"讨论会导致解释链跑偏——它们属于**执行引擎**，与运行时数据区并列。
2. **JIT 属于执行引擎，Code Cache 是 JIT 的产物**：Code Cache 位于**本地内存**（不在 JVM 堆内，也不在元空间内），受 `-XX:ReservedCodeCacheSize` 控制，默认 240 MB。Code Cache 打满后 JIT 停摆、程序退化解释执行，QPS 会**断崖式下跌**——这条常识 `12d` 篇会承接调优矩阵。
3. **直接内存 `DirectMemory` 不受 JVM 堆管理**：`ByteBuffer.allocateDirect(N)` / Netty PooledByteBufAllocator 走的是本地内存，堆参数 `-Xmx` 管不到它。上限由独立参数 `-XX:MaxDirectMemorySize` 控制（默认 = `-Xmx`）。**容器里 JVM 被 OOM Killer 杀却看不到 Java 堆 OOM 日志**的经典事故，十有八九是直接内存打爆——这条常识由 `12c` 篇承接排查手册。

📖 各子系统深度展开 → [类加载机制与双亲委派模型](@java-JVM-类加载机制与双亲委派模型)（类加载子系统） / [JVM 内存分区与对象布局](@java-JVM-内存分区与对象布局)（运行时数据区） / [JVM 现代实践与前沿技术](@java-JVM-现代实践与前沿技术)（JIT 分层编译 + Code Cache 调优）

---

## 3. JVM 知识地图

JVM 专题的知识结构共分**五大主干**（内存分区 / GC 机制 / 收集器演进 / 调优与实战 / 现代实践）。

```markmap
# JVM 内存与 GC

## 内存分区
- 堆 Heap
  - 新生代 Eden + S0 + S1
  - 老年代
  - TLAB 零锁分配
- 线程私有
  - 虚拟机栈与栈帧五件套
  - 程序计数器 PC
  - 本地方法栈
- 堆外
  - 元空间 MetaSpace
  - Code Cache
  - 直接内存 DirectMemory
- 对象布局
  - 对象头 Mark Word
  - 实例数据与对齐
  - 压缩指针 CompressedOops

## GC 机制
- 可达性分析
  - GC Roots 六种
- 三色标记
  - 增量更新（CMS）
  - SATB 快照（G1 / ZGC）
- 写屏障
  - CMS dirty card
  - G1 / ZGC SATB queue
- GC 算法
  - Mark-Sweep
  - Mark-Compact
  - Copying
- 逃逸分析
  - NoEscape / ArgEscape
  - 标量替换
  - 锁消除
- Safepoint
  - 主动轮询
  - Safe Region

## 收集器演进
- 经典
  - Serial / Serial Old
  - Parallel Scavenge / Old
- 并发开端
  - CMS 增量更新
- 现代
  - G1 Region 可控停顿
  - ZGC 染色指针亚毫秒
- 未来
  - 分代 ZGC（JDK 21）
  - Shenandoah

## 调优与实战
- 方法论
  - 目标 → 测量 → 分析 → 验证
- GC 日志分析
  - 统一日志 Xlog
- OOM 排查
  - 堆 / 栈 / 元空间 / 直接内存
- 生产 checklist

## 现代实践
- 容器化 JVM
  - UseContainerSupport
  - MaxRAMPercentage
- 虚拟线程 Loom
  - JEP 444 / 491
- 性能工具链
  - JFR（首选）
  - async-profiler
- 云原生
  - K8s 配置
  - 健康检查
- 前沿趋势
  - GraalVM Native
  - CRaC
  - Valhalla / Panama
```

---

## 4. 知识点导航表

| # | 子主题 | 核心一句话 | 详细文档 |
| :-- | :-- | :-- | :-- |
| 1 | **内存分区与对象布局** | 七大分区（三共享 + 三私有 + 一补充）+ 对象头 Mark Word 位布局 | [JVM 内存分区与对象布局](@java-JVM-内存分区与对象布局) |
| 2 | **GC 核心机制与收集器演进** | 可达性分析、三色标记、写屏障、Serial→Parallel→CMS→G1→ZGC 的演进主线 | [GC 核心机制与收集器演进](@java-JVM-GC核心机制与收集器演进) |
| 3 | **GC 调优实战与常见误区** | 调优方法论、参数矩阵、OOM 四字诀、生产 checklist | [GC 调优实战与常见误区](@java-JVM-GC调优实战与常见误区) |
| 4 | **JVM 现代实践与前沿技术** | 容器化 JVM、虚拟线程、JFR、JIT 深解、分代 ZGC、CRaC / Valhalla | [JVM 现代实践与前沿技术](@java-JVM-现代实践与前沿技术) |

---

## 5. 高频问题索引表

| 问题 | 详见 |
| :-- | :-- |
| JVM 内存分区有哪些？ | [JVM 内存分区与对象布局](@java-JVM-内存分区与对象布局) §1 |
| JDK 8 为何用元空间替代永久代？ | [JVM 内存分区与对象布局](@java-JVM-内存分区与对象布局) §5 + Q&A |
| 为什么年轻代和老年代分开？ | [GC 核心机制与收集器演进](@java-JVM-GC核心机制与收集器演进) §11 Q1 |
| G1 是怎么做到可预测停顿的？ | [GC 核心机制与收集器演进](@java-JVM-GC核心机制与收集器演进) §8 + §11 Q2 |
| ZGC 为什么停顿时间这么短？ | [GC 核心机制与收集器演进](@java-JVM-GC核心机制与收集器演进) §9 |
| 堆外内存该用多少？ | [GC 调优实战与常见误区](@java-JVM-GC调优实战与常见误区) §8 Q1 |
| Full GC 频繁怎么排查？ | [GC 调优实战与常见误区](@java-JVM-GC调优实战与常见误区) §8 Q2 |
| 容器里 JVM 被 OOM Killer 怎么办？ | [JVM 现代实践与前沿技术](@java-JVM-现代实践与前沿技术) §1 + §8 Q1 |
| 虚拟线程适合什么场景？ | [JVM 现代实践与前沿技术](@java-JVM-现代实践与前沿技术) §2 + §8 Q2 |
| G1 vs ZGC 生产如何选型？ | [GC 调优实战与常见误区](@java-JVM-GC调优实战与常见误区) §8 Q4 |

---

## 6. 学习路径建议：三条路径按读者场景分流

> ⭐ **综览型页面为不同读者提供三条独立的入口路径**——初学者建立心智模型走"自底向上"；线上救火按现象反向定位走"问题导向"；面试冲刺按考点密度走"高频专项"。三条路径互不干扰，各取所需。

### 6.1 初学者路径（自底向上，重在建立心智模型）

```mermaid
flowchart LR
    A[内存分区<br>与对象布局] --> B[GC核心机制<br>与收集器演进]
    B --> C[GC调优实战<br>与常见误区]
    C --> D[JVM现代实践<br>与前沿技术]
```

**推荐顺序**：

1. 先读 [JVM 内存分区与对象布局](@java-JVM-内存分区与对象布局)——建立"对象在哪、栈帧怎么回事、PC 是什么"的基本认知
2. 再读 [GC 核心机制与收集器演进](@java-JVM-GC核心机制与收集器演进)——理解"GC 是怎么找垃圾的、收集器是怎么演进的"
3. 然后看 [GC 调优实战与常见误区](@java-JVM-GC调优实战与常见误区)——把理论落到"参数怎么配、OOM 怎么排查"
4. 最后读 [JVM 现代实践与前沿技术](@java-JVM-现代实践与前沿技术)——接轨云原生 / 虚拟线程 / 分代 ZGC 等前沿

### 6.2 线上救火路径（问题导向）

- **OOM 崩溃** → 直接看 [GC 调优实战与常见误区](@java-JVM-GC调优实战与常见误区) §4 OOM 排查流程
- **Full GC 频繁** → [GC 调优实战与常见误区](@java-JVM-GC调优实战与常见误区) §3 诊断决策树
- **容器被 OOM Killer** → [JVM 现代实践与前沿技术](@java-JVM-现代实践与前沿技术) §1 容器化 JVM 调优
- **P99 抖动** → [GC 核心机制与收集器演进](@java-JVM-GC核心机制与收集器演进) §9 ZGC + [GC 调优实战与常见误区](@java-JVM-GC调优实战与常见误区) §5 参数矩阵

### 6.3 面试冲刺路径（高频考点）

- **底层机制题**（GC Roots、三色标记、Mark Word 位布局、染色指针）→ [JVM 内存分区与对象布局](@java-JVM-内存分区与对象布局) + [GC 核心机制与收集器演进](@java-JVM-GC核心机制与收集器演进) 的 Q&A
- **调优排查题**（Full GC 分析、OOM 定位、JVM 参数选择）→ [GC 调优实战与常见误区](@java-JVM-GC调优实战与常见误区) §8 Q&A
- **前沿技术题**（虚拟线程、ZGC、分代 ZGC、GraalVM）→ [JVM 现代实践与前沿技术](@java-JVM-现代实践与前沿技术) §8 Q&A

> 📖 **本文不设 Q&A 章节**——综览型页面用 §5 高频问题索引表已充分承担"读者视角的问题路由"职责，具体机制/排查/选型题一律去姊妹文档 Q&A 展开。
