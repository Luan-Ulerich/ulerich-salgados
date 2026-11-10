# ulerich-salgados

Monorepo.

```
.
├── apps/
│   ├── api/   # Spring Boot (Java 21, Maven)
│   └── web/   # React + Vite
└── docker-compose.yml   # Postgres 16
```

## Rodando

```bash
# banco
docker compose up -d

# api (http://localhost:8080)
cd apps/api && ./mvnw spring-boot:run

# web
cd apps/web && npm install && npm run dev
```

Health: `GET http://localhost:8080/actuator/health`
