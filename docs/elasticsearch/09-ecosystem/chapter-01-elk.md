# ELK Stack

## 1. 架构

```
App/Filebeat → Logstash → Elasticsearch → Kibana
    ↑            ↑            ↑            ↑
  采集         处理         存储/搜索    可视化
```

## 2. Logstash 配置

```ruby
input {
  beats {
    port => 5044
  }
}

filter {
  grok {
    match => { "message" => "%{COMBINEDAPACHELOG}" }
  }
  date {
    match => [ "timestamp", "dd/MMM/yyyy:HH:mm:ss Z" ]
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "logs-%{+YYYY.MM.dd}"
  }
}
```

## 3. Filebeat 配置

```yaml
filebeat.inputs:
  - type: log
    paths:
      - /var/log/*.log

output.elasticsearch:
  hosts: ["localhost:9200"]
  index: "filebeat-%{+yyyy.MM.dd}"
```

## 4. Kibana

- 访问 `http://localhost:5601`
- 创建 Index Pattern
- 可视化分析

---
*待补充：更多 ELK 细节*
