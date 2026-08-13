# 认证机制

## 1. Session 认证

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.formLogin(form -> form
                .loginPage("/login")
                .defaultSuccessUrl("/dashboard"))
            .logout(logout -> logout.logoutSuccessUrl("/login"));
        return http.build();
    }
}
```

## 2. JWT 认证

```java
@Component
public class JwtTokenProvider {
    public String generateToken(UserDetails userDetails) {
        return Jwts.builder()
            .setSubject(userDetails.getUsername())
            .setExpiration(new Date(System.currentTimeMillis() + expiration))
            .signWith(SignatureAlgorithm.HS256, secret)
            .compact();
    }
    
    public boolean validateToken(String token) {
        try {
            Jwts.parser().setSigningKey(secret).parseClaimsJws(token);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }
}
```

## 3. OAuth2

```java
@Configuration
public class OAuth2Config {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.oauth2Login(oauth2 -> oauth2
                .defaultSuccessUrl("/dashboard"));
        return http.build();
    }
}
```

---
*待补充：更多认证场景*
