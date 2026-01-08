---
sidebar_position: 1
---

# Деплой на VPS

## Требования к серверу

- Ubuntu 22.04+ / Debian 12+
- 1 CPU, 1 GB RAM (минимум)
- Node.js 20+
- PostgreSQL 15+
- Nginx
- PM2

## GitHub Secrets

Добавьте в настройках репозитория (Settings → Secrets → Actions):

| Secret | Описание | Пример |
|--------|----------|--------|
| `VPS_HOST` | IP адрес или домен сервера | `123.45.67.89` |
| `VPS_USER` | Пользователь SSH | `deploy` |
| `VPS_SSH_KEY` | Приватный SSH ключ | `-----BEGIN OPENSSH...` |
| `VPS_PORT` | Порт SSH (опционально) | `22` |

## Первичная настройка сервера

### 1. Запустите скрипт настройки

```bash
# На сервере от root
curl -fsSL https://raw.githubusercontent.com/YOUR_REPO/main/scripts/setup-server.sh | bash
```

Или вручную:

```bash
# Установка зависимостей
apt update && apt upgrade -y
apt install -y nodejs npm postgresql nginx certbot python3-certbot-nginx
npm install -g pm2
```

### 2. Настройка PostgreSQL

```bash
sudo -u postgres psql

CREATE USER money_user WITH PASSWORD 'your_strong_password';
CREATE DATABASE money_db OWNER money_user;
GRANT ALL PRIVILEGES ON DATABASE money_db TO money_user;
\q
```

### 3. Клонирование репозитория

```bash
mkdir -p /var/www/money
cd /var/www/money
git clone https://github.com/YOUR_USERNAME/money.git .
```

### 4. Настройка backend

```bash
cd /var/www/money/backend
cp .env.example .env
nano .env
```

Заполните `.env`:

```env
DATABASE_URL="postgresql://money_user:your_password@localhost:5432/money_db?schema=public"
JWT_SECRET="your-very-long-random-secret-key-min-32-chars"
JWT_REFRESH_SECRET="another-very-long-random-secret-key"
NODE_ENV="production"
PORT=4000
FRONTEND_URL="https://your-domain.com"

# Email (опционально)
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@your-domain.com"
```

### 5. Первый запуск

```bash
# Backend
cd /var/www/money/backend
npm ci
npx prisma migrate deploy
npx prisma db seed
npm run build

# Frontend
cd /var/www/money/frontend
npm ci
npm run build

# Запуск PM2
pm2 start /var/www/money/backend/dist/main.js --name money-backend
pm2 save
pm2 startup
```

### 6. Настройка Nginx

Файл `/etc/nginx/sites-available/money`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/money/frontend/dist;
        try_files $uri $uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API
    location /api {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/money /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 7. SSL сертификат

```bash
certbot --nginx -d your-domain.com
```

## Автоматический деплой

После настройки secrets, каждый push в `main`:

1. CI запускает lint и тесты
2. При успехе — SSH на сервер
3. `git pull`, `npm ci`, `prisma migrate`, `npm run build`
4. PM2 перезапускает backend

## Команды PM2

```bash
pm2 status              # Статус
pm2 logs money-backend  # Логи
pm2 restart money-backend  # Перезапуск
pm2 monit               # Мониторинг
```

## Бэкапы PostgreSQL

Добавьте в cron (`crontab -e`):

```bash
# Ежедневный бэкап в 3:00
0 3 * * * pg_dump -U money_user money_db | gzip > /var/backups/money_$(date +\%Y\%m\%d).sql.gz

# Удаление бэкапов старше 30 дней
0 4 * * * find /var/backups -name "money_*.sql.gz" -mtime +30 -delete
```

## Troubleshooting

### Приложение не запускается

```bash
pm2 logs money-backend --lines 100
```

### Ошибки миграций

```bash
cd /var/www/money/backend
npx prisma migrate status
npx prisma migrate deploy
```

### Nginx 502 Bad Gateway

```bash
# Проверить что backend запущен
pm2 status

# Проверить порт
curl http://127.0.0.1:4000/api/health
```
