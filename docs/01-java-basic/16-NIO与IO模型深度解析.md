---
doc_id: java-NIO与IO模型深度解析
title: Java NIO 与 I/O 模型深度解析
---

# Java NIO 与 I/O 模型深度解析

## 一、五种 I/O 模型总览

在深入 Java NIO 之前，需要先理解操作系统层面的 I/O 模型。Unix/Linux 定义了五种 I/O 模型，Java 的 BIO/NIO/AIO 分别对应其中几种。

### 1.1 五种模型对比

```txt
┌──────────────┬──────────────────────────────┬───────────────────────┐
│   I/O 模型    │      阶段一：等待数据          │   阶段二：数据拷贝       │
│              │   (内核等待网卡数据到来)        │  (内核→用户空间拷贝)     │
├──────────────┼──────────────────────────────┼───────────────────────┤
│ 阻塞 I/O      │          阻塞等待             │        阻塞等待        │
│ (BIO)        │                              │                       │
├──────────────┼──────────────────────────────┼───────────────────────┤
│ 非阻塞 I/O    │    轮询返回 EWOULDBLOCK        │        阻塞等待        │
│ (NIO 基础)    │                              │                       │
├──────────────┼──────────────────────────────┼───────────────────────┤
│ I/O 多路复用   │  select/poll/epoll 阻塞等待   │        阻塞等待        │
│ (Java NIO)   │  (可同时监听多个 fd)           │                       │
├──────────────┼──────────────────────────────┼───────────────────────┤
│ 信号驱动 I/O   │  注册信号处理器后立即返回        │        阻塞等待        │
│              │  数据就绪时收到 SIGIO 信号      │                       │
├──────────────┼──────────────────────────────┼───────────────────────┤
│ 异步 I/O      │          不阻塞               │       不阻塞           │
│ (Java AIO)   │  内核完成两个阶段后通知应用       │  (内核完成后回调)      │
└──────────────┴──────────────────────────────┴───────────────────────┘
```

!!! note "同步 vs 异步的本质区别"
    - **同步 I/O**：数据拷贝阶段（内核→用户空间）由应用程序线程完成，包括阻塞 I/O、非阻塞 I/O、I/O 多路复用、信号驱动 I/O
    - **异步 I/O**：两个阶段全部由内核完成，应用程序只需注册回调，Java AIO（`AsynchronousChannel`）对应此模型

### 1.2 Java 三种 I/O 模型对应关系

| Java API | 对应 I/O 模型 | 线程模型 | 适用场景 |
| :--- | :--- | :--- | :--- |
| `java.io.*`（BIO） | 阻塞 I/O | 每连接一线程 | 连接数少、逻辑复杂 |
| `java.nio.*`（NIO） | I/O 多路复用 | 少量线程处理大量连接 | 高并发、短连接 |
| `java.nio.channels.AsynchronousChannel`（AIO） | 异步 I/O | 回调/Future | 文件 I/O 场景 |

!!! tip "为什么 Netty 选择 NIO 而非 AIO？"
    Linux 的 AIO 实现（`io_uring` 之前）并不成熟，性能不如 epoll。Netty 在 Linux 上底层使用 epoll，在 macOS 上使用 kqueue，均属于 I/O 多路复用模型。

---

## 二、BIO 的问题：一连接一线程

```java
// BIO 服务端：每个连接创建一个线程
ServerSocket serverSocket = new ServerSocket(8080);
while (true) {
    Socket socket = serverSocket.accept(); // 阻塞等待连接
    new Thread(() -> {
        try {
            InputStream in = socket.getInputStream();
            byte[] buf = new byte[1024];
            int len;
            while ((len = in.read(buf)) != -1) { // 阻塞等待数据
                // 处理数据...
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }).start();
}
```

```txt
BIO 线程模型：
  Client1     ──→ Thread-1 (阻塞在 read)
  Client2     ──→ Thread-2 (阻塞在 read)
  Client3     ──→ Thread-3 (阻塞在 read)
  ...
  Client10000 ──→ Thread-10000 (OOM!)

问题：
  - 每个线程占用约 512KB~1MB 栈内存
  - 10000 个连接 = 5~10GB 内存
  - 大量线程上下文切换开销
```

---

## 三、NIO 三大核心组件

Java NIO 的核心由三个组件构成：**Channel（通道）**、**Buffer（缓冲区）**、**Selector（选择器）**。

### 3.1 Channel（通道）

Channel 是双向的数据传输通道，与传统 I/O 的 Stream 相比：

| 特性 | Stream（BIO） | Channel（NIO） |
| :--- | :--- | :--- |
| 方向 | 单向（InputStream/OutputStream） | 双向（可读可写） |
| 阻塞 | 始终阻塞 | 可配置为非阻塞 |
| 数据单位 | 字节/字符 | Buffer |
| 常用实现 | `FileInputStream` | `FileChannel`、`SocketChannel`、`ServerSocketChannel` |

```java
// 打开一个 SocketChannel 并设置为非阻塞
SocketChannel channel = SocketChannel.open();
channel.configureBlocking(false); // 关键：设置非阻塞
channel.connect(new InetSocketAddress("localhost", 8080));
```

### 3.2 Buffer（缓冲区）

Buffer 是 NIO 中数据读写的载体，本质是一块内存区域，通过四个关键属性管理读写状态：

```txt
Buffer 内部结构（capacity=10，已写入3个字节后）：

  index:  0    1    2    3    4    5    6    7    8    9
        [d1] [d2] [d3] [  ] [  ] [  ] [  ] [  ] [  ] [  ]
          ↑              ↑                               ↑
        mark           position                       limit(=capacity)

  四个核心属性：
  - capacity：缓冲区总容量，创建后不变
  - limit：   当前可操作的上限（写模式=capacity，读模式=已写数据量）
  - position：当前读/写位置指针
  - mark：    标记位，调用 reset() 可回到此位置
```

**Buffer 状态切换（最易出错的地方）：**

```txt
写模式 → 读模式：flip()
  position=0, limit=已写数据量

读模式 → 写模式（清空重写）：clear()
  position=0, limit=capacity（数据未清除，只是指针重置）

读模式 → 写模式（保留未读数据）：compact()
  将未读数据移到 buffer 头部，position=未读数据量
```

```java
ByteBuffer buffer = ByteBuffer.allocate(10);

// 写入数据（写模式）
buffer.put((byte) 'H');
buffer.put((byte) 'i');
// position=2, limit=10

// 切换到读模式
buffer.flip();
// position=0, limit=2

// 读取数据
while (buffer.hasRemaining()) {
    System.out.print((char) buffer.get());
}

// 清空，准备下次写入
buffer.clear();
// position=0, limit=10
```

!!! warning "flip() 忘记调用是 NIO 新手最常见的 Bug"
    写完数据后必须调用 `flip()` 才能切换到读模式。忘记调用会导致读取到空数据或错误数据。

**直接缓冲区 vs 堆缓冲区：**

```java
// 堆缓冲区：在 JVM 堆上分配，受 GC 管理
ByteBuffer heapBuffer = ByteBuffer.allocate(1024);

// 直接缓冲区：在操作系统内存上分配，不受 GC 管理
ByteBuffer directBuffer = ByteBuffer.allocateDirect(1024);
```

!!! tip "直接缓冲区的适用场景"
    直接缓冲区避免了 JVM 堆内存到操作系统内存的一次拷贝，适合大量 I/O 操作的场景（如 Netty 的 `PooledDirectByteBuf`）。但创建和销毁开销较大，不适合频繁创建小缓冲区。详见 @04-jvm 直接内存章节。

### 3.3 Selector（选择器）

Selector 是 NIO 实现 I/O 多路复用的核心，允许单个线程监听多个 Channel 的 I/O 事件。

```txt
Selector 工作原理：

  Thread
    │
    ▼
  Selector ──── 注册 ────→ Channel-1 (SocketChannel,       监听 READ)
    │           注册 ────→ Channel-2 (SocketChannel,       监听 READ|WRITE)
    │           注册 ────→ Channel-3 (ServerSocketChannel, 监听 ACCEPT)
    │
    │  select() 阻塞，等待任意 Channel 就绪
    │
    ▼
  SelectionKey Set（就绪的 Channel 集合）
    ├── Channel-1 READ   就绪 → 读取数据
    └── Channel-3 ACCEPT 就绪 → 接受新连接
```

**四种 SelectionKey 事件类型：**

| 事件常量 | 值 | 含义 |
| :--- | :--- | :--- |
| `SelectionKey.OP_ACCEPT` | 16 | 服务端接受新连接 |
| `SelectionKey.OP_CONNECT` | 8 | 客户端连接建立完成 |
| `SelectionKey.OP_READ` | 1 | Channel 有数据可读 |
| `SelectionKey.OP_WRITE` | 4 | Channel 可以写入数据 |

---

## 四、完整 NIO Echo Server 示例

```java
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.nio.channels.*;
import java.util.Iterator;
import java.util.Set;

public class NioEchoServer {

    public static void main(String[] args) throws IOException {
        // 1. 创建 Selector
        Selector selector = Selector.open();

        // 2. 创建 ServerSocketChannel 并绑定端口
        ServerSocketChannel serverChannel = ServerSocketChannel.open();
        serverChannel.configureBlocking(false); // 必须设置非阻塞
        serverChannel.bind(new InetSocketAddress(8080));

        // 3. 将 ServerSocketChannel 注册到 Selector，监听 ACCEPT 事件
        serverChannel.register(selector, SelectionKey.OP_ACCEPT);
        System.out.println("NIO Echo Server 启动，监听端口 8080");

        ByteBuffer buffer = ByteBuffer.allocate(1024);

        while (true) {
            // 4. 阻塞等待，直到至少一个 Channel 就绪
            int readyCount = selector.select();
            if (readyCount == 0) continue;

            // 5. 获取就绪的 SelectionKey 集合
            Set<SelectionKey> selectedKeys = selector.selectedKeys();
            Iterator<SelectionKey> iterator = selectedKeys.iterator();

            while (iterator.hasNext()) {
                SelectionKey key = iterator.next();
                iterator.remove(); // 必须手动移除，否则下次还会处理

                if (key.isAcceptable()) {
                    // 6a. 处理新连接
                    ServerSocketChannel server = (ServerSocketChannel) key.channel();
                    SocketChannel clientChannel = server.accept();
                    clientChannel.configureBlocking(false);
                    // 注册 READ 事件，监听客户端发来的数据
                    clientChannel.register(selector, SelectionKey.OP_READ);
                    System.out.println("新连接：" + clientChannel.getRemoteAddress());

                } else if (key.isReadable()) {
                    // 6b. 处理读事件
                    SocketChannel clientChannel = (SocketChannel) key.channel();
                    buffer.clear();
                    int bytesRead = clientChannel.read(buffer);

                    if (bytesRead == -1) {
                        // 客户端关闭连接
                        clientChannel.close();
                        key.cancel();
                        continue;
                    }

                    // Echo：将收到的数据原样返回
                    buffer.flip();
                    clientChannel.write(buffer);
                }
            }
        }
    }
}
```

!!! note "关键细节说明"
    1. `iterator.remove()` 必须调用：`selectedKeys()` 不会自动清除已处理的 key
    2. `configureBlocking(false)` 必须在 `register()` 之前调用
    3. `bytesRead == -1` 表示对端关闭了连接（TCP FIN）

---

## 五、select / poll / epoll 底层对比

Java NIO 的 Selector 在不同操作系统上有不同的底层实现：

- **Linux**：优先使用 `epoll`（JDK 1.5+），降级使用 `poll`
- **macOS**：使用 `kqueue`
- **Windows**：使用 `select`

### 5.1 三种机制对比

| 特性 | select | poll | epoll |
| :--- | :--- | :--- | :--- |
| 数据结构 | `fd_set`（位图） | `pollfd` 数组 | 红黑树 + 就绪链表 |
| 最大 fd 数量 | 1024（`FD_SETSIZE`） | 无限制 | 无限制 |
| 时间复杂度 | O(n)，每次遍历所有 fd | O(n)，每次遍历所有 fd | O(1)，只处理就绪 fd |
| 内核/用户空间拷贝 | 每次调用都需拷贝 fd 集合 | 每次调用都需拷贝 | 只在注册时拷贝一次 |
| 触发方式 | 水平触发（LT） | 水平触发（LT） | 支持 LT 和 ET |
| 适用场景 | 连接数少（<1024） | 连接数中等 | 高并发（C10K+） |

### 5.2 epoll 工作原理

```txt
epoll 三个核心系统调用：

  epoll_create()
    └── 在内核创建一个 eventpoll 对象
        ├── 红黑树：存储所有注册的 fd
        └── 就绪链表：存储已就绪的 fd

  epoll_ctl(epfd, EPOLL_CTL_ADD, fd, event)
    └── 将 fd 注册到红黑树
        └── 为 fd 的网卡驱动注册回调函数
            当 fd 就绪时，回调函数将其加入就绪链表

  epoll_wait(epfd, events, maxevents, timeout)
    └── 检查就绪链表
        ├── 链表非空 → 立即返回就绪的 fd 列表（O(1)）
        └── 链表为空 → 阻塞等待，直到有 fd 就绪或超时
```

**水平触发（LT）vs 边缘触发（ET）：**

```txt
水平触发（Level Trigger，默认）：
  只要 fd 处于就绪状态，每次 epoll_wait 都会返回该 fd
  → 数据没读完，下次还会通知
  → 编程简单，不易丢数据

边缘触发（Edge Trigger）：
  只在 fd 状态变化时通知一次（从未就绪 → 就绪）
  → 必须一次性读完所有数据（循环读直到 EAGAIN）
  → 性能更高，Nginx 使用 ET 模式
```

---

## 六、FileChannel 与零拷贝

### 6.1 传统文件传输的四次拷贝

```txt
传统 read() + write() 文件传输：

  磁盘 ──DMA拷贝──→ 内核缓冲区 ──CPU拷贝──→ 用户缓冲区
                                                  │
                                               CPU拷贝
                                                  │
  网卡 ←──DMA拷贝──── Socket缓冲区 ←──────────────┘

  共 4 次拷贝（2次DMA + 2次CPU），4 次上下文切换
```

### 6.2 sendfile 零拷贝（Java NIO transferTo）

```txt
FileChannel.transferTo() 底层使用 sendfile 系统调用：

  磁盘 ──DMA拷贝──→ 内核缓冲区 ──CPU拷贝──→ Socket缓冲区 ──DMA拷贝──→ 网卡

  共 3 次拷贝（2次DMA + 1次CPU），2 次上下文切换
  （Linux 2.4+ 支持 scatter/gather DMA，可进一步减少到 2 次拷贝）
```

```java
// Java NIO 零拷贝示例：高效文件传输
try (FileChannel sourceChannel = FileChannel.open(Paths.get("source.txt"),
                                                   StandardOpenOption.READ);
     FileChannel destChannel = FileChannel.open(Paths.get("dest.txt"),
                                                 StandardOpenOption.WRITE,
                                                 StandardOpenOption.CREATE)) {
    // transferTo 底层调用 sendfile 系统调用
    long transferred = sourceChannel.transferTo(0, sourceChannel.size(), destChannel);
    System.out.println("传输字节数：" + transferred);
}
```

!!! tip "Kafka 为什么吞吐量高？"
    Kafka 消费者拉取消息时，Broker 使用 `FileChannel.transferTo()` 将日志文件直接传输到网络 Socket，避免了数据在用户空间的拷贝，这是 Kafka 高吞吐的核心原因之一。详见 @04-jvm 直接内存与零拷贝章节。

---

## 七、从 NIO 到 Netty：原生 NIO 的痛点

虽然 NIO 性能强大，但直接使用原生 NIO 编程存在诸多问题，这也是 Netty 诞生的原因。

### 7.1 原生 NIO 的五大痛点

```txt
痛点一：JDK NIO 空轮询 Bug（Epoll Bug）
  现象：selector.select() 本应阻塞，但在某些 Linux 内核版本下
        会无限返回 0（没有任何 fd 就绪），导致 CPU 100%
  原因：Linux epoll 在特定场景下会错误地唤醒 select
  Netty 解决方案：检测到空轮询次数超过阈值（默认512次），
                  重建 Selector，将旧 Channel 重新注册

痛点二：粘包 / 拆包问题
  TCP 是流式协议，没有消息边界
  发送方：send("Hello") + send("World")
  接收方可能收到："HelloWorld"（粘包）
                  "Hel" + "loWorld"（拆包）
  Netty 解决方案：提供 LineBasedFrameDecoder、
                  LengthFieldBasedFrameDecoder 等开箱即用的解码器

痛点三：ByteBuffer 使用复杂
  flip()/clear()/compact() 状态管理容易出错
  Netty 解决方案：ByteBuf 使用 readerIndex/writerIndex 双指针，
                  无需手动 flip()

痛点四：没有连接超时、心跳机制
  Netty 解决方案：IdleStateHandler 处理读写超时

痛点五：没有编解码框架
  Netty 解决方案：提供 Protobuf、JSON、HTTP 等编解码器
```

### 7.2 Netty 的线程模型

```txt
Netty Reactor 线程模型（主从多 Reactor）：

  BossGroup（1个线程）          WorkerGroup（CPU核数×2 个线程）
       │                                │
  ServerSocketChannel             SocketChannel × N
  只负责 ACCEPT 事件              负责 READ/WRITE 事件
       │                                │
       └──── 新连接 ────────────────────┘
             注册到 WorkerGroup 的某个线程
```

!!! note "Netty 与 NIO 的关系"
    Netty 是对 Java NIO 的高层封装，底层仍然使用 `Selector` 和 `Channel`。理解了本文的 NIO 原理，就掌握了 Netty 的底层基础。

---

## 八、常见面试题

**Q：Java NIO 和 BIO 的核心区别是什么？**

```txt
A：
  1. 阻塞模型不同：BIO 的 read/write 会阻塞线程；NIO 通过 Selector 实现
     单线程监听多个 Channel，只有 Channel 就绪时才处理
  2. 数据单位不同：BIO 以字节/字符为单位；NIO 以 Buffer 为单位
  3. 线程模型不同：BIO 一连接一线程；NIO 少量线程处理大量连接
```

**Q：select、poll、epoll 的区别？**

```txt
A：
  - select：fd 数量限制 1024，每次调用需拷贝 fd 集合，O(n) 遍历
  - poll：  无 fd 数量限制，每次调用需拷贝 pollfd 数组，O(n) 遍历
  - epoll： 无 fd 数量限制，fd 只注册一次，O(1) 返回就绪 fd，
            支持边缘触发（ET），适合高并发场景
```

**Q：Netty 为什么不直接使用 Java AIO？**

```txt
A：
  1. Linux AIO（POSIX aio）实现不成熟，实际上是用线程池模拟的
  2. epoll 在 Linux 上性能已经足够好，没有必要使用 AIO
  3. Netty 在 Linux 上使用 epoll，在 macOS 上使用 kqueue，
     均属于 I/O 多路复用，性能优于 Linux AIO
```

**Q：`FileChannel.transferTo()` 为什么比普通读写快？**

```txt
A：
  普通读写需要 4 次拷贝（磁盘→内核缓冲区→用户缓冲区→Socket缓冲区→网卡）
  transferTo() 底层使用 sendfile 系统调用，减少到 3 次拷贝（甚至 2 次），
  并减少了用户态/内核态的上下文切换次数，因此性能更高。
```
