# 状态存储

## 1. RocksDB

Kafka Streams 默认使用 RocksDB 存储状态。

```java
// 自定义状态存储
StoreBuilder<KeyValueStore<String, Long>> storeBuilder =
    Stores.keyValueStoreBuilder(
        Stores.persistentKeyValueStore("my-store"),
        Serdes.String(),
        Serdes.Long()
);

builder.addStateStore(storeBuilder);
```

## 2. 交互式查询

```java
ReadOnlyKeyValueStore<String, Long> store = streams.store(
    StoreQueryParameters.fromNameAndType("my-store", QueryableStoreTypes.keyStore())
);

// 查询单个 Key
Long value = store.get("key");

// 查询所有
KeyValueIterator<String, Long> all = store.all();
```

## 3. 状态恢复

- 状态存储在本地 RocksDB
- 通过 Changelog Topic 恢复
- 无需外部数据库

---
*待补充：更多状态存储细节*
