---
title: gRPC 详解
---

# gRPC 详解

## 一、什么是 gRPC？

**gRPC** 是 Google 于 2015 年开源的高性能 RPC 框架，全称 **Google Remote Procedure Call**。

它基于以下两项核心技术构建：
- **HTTP/2**：作为传输协议，支持多路复用、双向流、头部压缩
- **Protocol Buffers（Protobuf）**：作为接口定义语言（IDL）和序列化格式

> 官网：https://grpc.io

---

## 二、核心组成

### 2.1 Protocol Buffers（Protobuf）

Protobuf 是 gRPC 的"契约文件"，用 `.proto` 文件定义服务接口和数据结构。

```protobuf
// user.proto
syntax = "proto3";

package user;

// 定义服务
service UserService {
  rpc GetUser (GetUserRequest) returns (UserResponse);
  rpc ListUsers (ListUsersRequest) returns (stream UserResponse);
}

// 定义请求/响应消息
message GetUserRequest {
  int64 id = 1;
}

message UserResponse {
  int64 id = 1;
  string name = 2;
  string email = 3;
}

message ListUsersRequest {
  int32 page = 1;
  int32 page_size = 2;
}
```

**字段编号的作用**：Protobuf 序列化时用字段编号（而非字段名）标识字段，这是它体积小、解析快的关键。

### 2.2 HTTP/2 传输

相比 HTTP/1.1，HTTP/2 带来了显著提升：

| 特性 | HTTP/1.1 | HTTP/2 |
|------|----------|--------|
| 连接复用 | ❌ 每次请求新建连接 | ✅ 单连接多路复用 |
| 头部压缩 | ❌ 每次全量发送 | ✅ HPACK 压缩 |
| 双向流 | ❌ 不支持 | ✅ 支持 |
| 服务端推送 | ❌ 不支持 | ✅ 支持 |

---

## 三、四种通信模式

gRPC 支持四种调用方式，这是它比普通 HTTP 更强大的地方：

```
┌─────────────────────────────────────────────────────────┐
│  1. 一元 RPC（Unary）                                    │
│     Client ──请求──▶ Server ──响应──▶ Client            │
│     （最常用，类似普通函数调用）                          │
├─────────────────────────────────────────────────────────┤
│  2. 服务端流式（Server Streaming）                       │
│     Client ──请求──▶ Server ──流式响应──▶ Client        │
│     （如：订阅实时数据、大文件下载）                      │
├─────────────────────────────────────────────────────────┤
│  3. 客户端流式（Client Streaming）                       │
│     Client ──流式请求──▶ Server ──响应──▶ Client        │
│     （如：上传大文件、批量写入）                          │
├─────────────────────────────────────────────────────────┤
│  4. 双向流式（Bidirectional Streaming）                  │
│     Client ◀──流式──▶ Server                           │
│     （如：实时聊天、游戏对战）                            │
└─────────────────────────────────────────────────────────┘
```

对应 `.proto` 定义：

```protobuf
service ChatService {
  // 1. 一元 RPC
  rpc SendMessage (MessageRequest) returns (MessageResponse);

  // 2. 服务端流式
  rpc Subscribe (SubscribeRequest) returns (stream Event);

  // 3. 客户端流式
  rpc Upload (stream Chunk) returns (UploadResponse);

  // 4. 双向流式
  rpc Chat (stream ChatMessage) returns (stream ChatMessage);
}
```

---

## 四、工作流程

```
┌──────────────────────────────────────────────────────────────┐
│                        开发阶段                               │
│  编写 .proto 文件  ──▶  protoc 编译器  ──▶  生成各语言代码   │
│                                          (Java/Go/Python...)  │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                        运行阶段                               │
│                                                              │
│  Client                                      Server          │
│  ┌─────────┐                              ┌─────────┐        │
│  │ 调用方法 │──▶ Stub（存根）              │ 服务实现 │        │
│  └─────────┘    │                         └─────────┘        │
│                 │ 1. Protobuf 序列化                          │
│                 │ 2. HTTP/2 传输                              │
│                 │ 3. Protobuf 反序列化                        │
│                 ▼                                            │
│              Channel（连接管理）                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 五、Java 中使用 gRPC

### 5.1 添加依赖（Maven）

```xml
<dependencies>
    <!-- gRPC 核心 -->
    <dependency>
        <groupId>io.grpc</groupId>
        <artifactId>grpc-netty-shaded</artifactId>
        <version>1.60.0</version>
    </dependency>
    <dependency>
        <groupId>io.grpc</groupId>
        <artifactId>grpc-protobuf</artifactId>
        <version>1.60.0</version>
    </dependency>
    <dependency>
        <groupId>io.grpc</groupId>
        <artifactId>grpc-stub</artifactId>
        <version>1.60.0</version>
    </dependency>
</dependencies>

<build>
    <extensions>
        <!-- protobuf 编译插件 -->
        <extension>
            <groupId>kr.motd.maven</groupId>
            <artifactId>os-maven-plugin</artifactId>
            <version>1.7.1</version>
        </extension>
    </extensions>
    <plugins>
        <plugin>
            <groupId>org.xolstice.maven.plugins</groupId>
            <artifactId>protobuf-maven-plugin</artifactId>
            <version>0.6.1</version>
            <configuration>
                <protocArtifact>
                    com.google.protobuf:protoc:3.25.1:exe:${os.detected.classifier}
                </protocArtifact>
                <pluginId>grpc-java</pluginId>
                <pluginArtifact>
                    io.grpc:protoc-gen-grpc-java:1.60.0:exe:${os.detected.classifier}
                </pluginArtifact>
            </configuration>
        </plugin>
    </plugins>
</build>
```

### 5.2 编写 .proto 文件

```protobuf
// src/main/proto/user.proto
syntax = "proto3";

option java_package = "com.example.grpc";
option java_outer_classname = "UserProto";

package user;

service UserService {
  rpc GetUser (GetUserRequest) returns (UserResponse);
}

message GetUserRequest {
  int64 id = 1;
}

message UserResponse {
  int64 id = 1;
  string name = 2;
  string email = 3;
}
```

### 5.3 实现服务端

```java
// 继承自动生成的抽象类
public class UserServiceImpl extends UserServiceGrpc.UserServiceImplBase {

    @Override
    public void getUser(GetUserRequest request,
                        StreamObserver<UserResponse> responseObserver) {
        // 业务逻辑
        UserResponse response = UserResponse.newBuilder()
                .setId(request.getId())
                .setName("张三")
                .setEmail("zhangsan@example.com")
                .build();

        // 返回结果
        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }
}

// 启动服务器
public class GrpcServer {
    public static void main(String[] args) throws Exception {
        Server server = ServerBuilder.forPort(9090)
                .addService(new UserServiceImpl())
                .build()
                .start();

        System.out.println("gRPC 服务启动，端口：9090");
        server.awaitTermination();
    }
}
```

### 5.4 实现客户端

```java
public class GrpcClient {
    public static void main(String[] args) {
        // 创建 Channel（连接）
        ManagedChannel channel = ManagedChannelBuilder
                .forAddress("localhost", 9090)
                .usePlaintext()  // 开发环境不用 TLS
                .build();

        // 创建 Stub（存根，相当于代理对象）
        UserServiceGrpc.UserServiceBlockingStub stub =
                UserServiceGrpc.newBlockingStub(channel);

        // 像调用本地方法一样调用远程服务
        GetUserRequest request = GetUserRequest.newBuilder()
                .setId(1L)
                .build();

        UserResponse response = stub.getUser(request);
        System.out.println("用户名：" + response.getName());

        channel.shutdown();
    }
}
```

---

## 六、Spring Boot 集成 gRPC

实际项目中通常使用 `grpc-spring-boot-starter` 简化配置：

```xml
<dependency>
    <groupId>net.devh</groupId>
    <artifactId>grpc-spring-boot-starter</artifactId>
    <version>2.15.0.RELEASE</version>
</dependency>
```

**服务端**：

```java
@GrpcService  // 替代手动注册
public class UserServiceImpl extends UserServiceGrpc.UserServiceImplBase {

    @Autowired
    private UserRepository userRepository;

    @Override
    public void getUser(GetUserRequest request,
                        StreamObserver<UserResponse> responseObserver) {
        User user = userRepository.findById(request.getId());
        UserResponse response = UserResponse.newBuilder()
                .setId(user.getId())
                .setName(user.getName())
                .build();
        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }
}
```

**客户端**：

```java
@Service
public class UserClient {

    @GrpcClient("user-service")  // 对应配置文件中的服务名
    private UserServiceGrpc.UserServiceBlockingStub userStub;

    public UserResponse getUser(long id) {
        return userStub.getUser(
            GetUserRequest.newBuilder().setId(id).build()
        );
    }
}
```

**配置文件**：

```yaml
# 服务端
grpc:
  server:
    port: 9090

# 客户端
grpc:
  client:
    user-service:
      address: static://localhost:9090
      negotiation-type: plaintext
```

---

## 七、gRPC vs REST 对比

| 对比项 | gRPC | REST |
|--------|------|------|
| 协议 | HTTP/2 | HTTP/1.1 |
| 数据格式 | Protobuf（二进制） | JSON（文本） |
| 性能 | ✅ 高（体积小、解析快） | 相对低 |
| 流式支持 | ✅ 四种模式 | ❌ 有限支持 |
| 跨语言 | ✅ 自动生成代码 | ✅ 手动实现 |
| 可读性 | ❌ 二进制不可读 | ✅ JSON 可直接阅读 |
| 浏览器支持 | ❌ 需要 grpc-web | ✅ 原生支持 |
| 接口文档 | ✅ .proto 即文档 | 需要 Swagger 等工具 |
| 适用场景 | 内部微服务通信 | 对外 API、前后端通信 |

---

## 八、适用场景

✅ **推荐使用 gRPC 的场景**：
- 微服务内部高频调用，对性能要求高
- 需要双向流式通信（如实时推送、聊天）
- 多语言混合的微服务架构（Java、Go、Python 互调）
- 云原生环境（Kubernetes 生态天然支持）

❌ **不适合 gRPC 的场景**：
- 对外暴露的公共 API（浏览器兼容性差）
- 需要人工调试接口（二进制不可读）
- 团队对 Protobuf 不熟悉，学习成本高

---

## 九、面试常见问题

**Q：gRPC 为什么比 REST 性能高？**

> 两个原因：① Protobuf 二进制序列化体积更小、解析更快；② HTTP/2 多路复用减少了连接建立开销。

**Q：Protobuf 字段编号为什么不能随意修改？**

> Protobuf 序列化时用字段编号而非字段名标识字段。修改编号会导致新旧版本数据不兼容，反序列化出错。正确做法是只新增字段，废弃字段用 `reserved` 标记。

**Q：gRPC 如何做负载均衡？**

> gRPC 支持客户端负载均衡（通过 `NameResolver` + `LoadBalancer`）和服务端负载均衡（通过 Nginx/Envoy 代理）。在 Kubernetes 中通常配合 Istio 或 Envoy 做服务网格级别的负载均衡。

**Q：gRPC 和 Dubbo 怎么选？**

> - Java 技术栈为主、国内团队 → 优先考虑 **Dubbo**（生态成熟、文档丰富）
> - 多语言混合、云原生/K8s 环境 → 优先考虑 **gRPC**（跨语言强、CNCF 标准）