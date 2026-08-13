# Spring Data Elasticsearch

## 1. 依赖

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-elasticsearch</artifactId>
</dependency>
```

## 2. 配置

```yaml
spring:
  elasticsearch:
    uris: http://localhost:9200
```

## 3. 实体

```java
@Document(indexName = "products")
public class Product {
    @Id
    private String id;
    
    @Field(type = FieldType.Text, analyzer = "ik_max_word")
    private String name;
    
    @Field(type = FieldType.Keyword)
    private String category;
    
    @Field(type = FieldType.Double)
    private Double price;
}
```

## 4. Repository

```java
public interface ProductRepository extends ElasticsearchRepository<Product, String> {
    List<Product> findByName(String name);
    List<Product> findByPriceBetween(Double min, Double max);
}
```

## 5. 搜索

```java
@Autowired
private ElasticsearchRestTemplate elasticsearchTemplate;

public List<Product> search(String keyword) {
    NativeQuery query = new NativeQueryBuilder()
        .withQuery(QueryBuilders.multiMatchQuery(keyword, "name", "description"))
        .build();
    return elasticsearchTemplate.search(query, Product.class);
}
```

---
*待补充：更多 Spring 集成*
