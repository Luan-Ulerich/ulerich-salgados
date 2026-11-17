# Deploy em Produção (Docker Compose)

## 1. Preencher o `.env.prod`

Copie o arquivo de exemplo e preencha os valores reais:

```bash
cp .env.prod.example .env.prod
```

Gere senhas e segredos fortes para `POSTGRES_PASSWORD` e `JWT_SECRET` com:

```bash
openssl rand -base64 48
```

Defina em `.env.prod`:
- `SITE_ADDRESS`: o domínio real apontando para o servidor (ex.: `salgados.seudominio.com.br`), ou `:80` para teste local sem HTTPS.
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: credenciais do PostgreSQL.
- `JWT_SECRET`: segredo de assinatura JWT.
- `APP_ADMIN_NAME`, `APP_ADMIN_EMAIL`, `APP_ADMIN_PASSWORD`: dados do primeiro usuário administrador.

## 2. Subir os containers

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## 3. Ver logs e status

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f
```

## 4. Atualizar a aplicação

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## 5. Firewall do servidor

Mantenha abertas no firewall **somente** as portas:
- `22` (SSH)
- `80` (HTTP / renovação ACME e redirecionamento)
- `443` (HTTPS)

O banco (`5432`) e a API (`8080`) **não** publicam portas no host e ficam restritos à rede interna do Docker.
