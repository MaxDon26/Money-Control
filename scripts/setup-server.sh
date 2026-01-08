#!/bin/sh
# Money Control Server Setup (cloud-init compatible)
# Для Timeweb и других облачных провайдеров

set -e

echo "=== Money Control Server Setup ==="

# Переменные
APP_DIR="/var/www/money"
DB_PASSWORD="$(openssl rand -base64 24)"

# 1. Обновление системы
echo "=== Updating system ==="
apt update && apt upgrade -y

# 2. Установка Node.js 20
echo "=== Installing Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. Установка PM2
echo "=== Installing PM2 ==="
npm install -g pm2

# 4. Установка PostgreSQL
echo "=== Installing PostgreSQL ==="
apt install -y postgresql postgresql-contrib

# 5. Установка Nginx
echo "=== Installing Nginx ==="
apt install -y nginx

# 6. Установка Certbot (SSL)
echo "=== Installing Certbot ==="
apt install -y certbot python3-certbot-nginx

# 7. Установка Git
apt install -y git

# 8. Создание директории приложения
echo "=== Creating app directory ==="
mkdir -p $APP_DIR

# 9. Настройка PostgreSQL
echo "=== Configuring PostgreSQL ==="
sudo -u postgres psql -c "CREATE USER money_user WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE money_db OWNER money_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE money_db TO money_user;"

# 10. Клонирование репозитория
echo "=== Cloning repository ==="
cd $APP_DIR
git clone https://github.com/MaxDon26/Money-Control.git .

# 11. Создание .env файла
echo "=== Creating .env file ==="
cat > $APP_DIR/backend/.env << ENVEOF
DATABASE_URL="postgresql://money_user:$DB_PASSWORD@localhost:5432/money_db?schema=public"
JWT_SECRET="$(openssl rand -base64 32)"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"
NODE_ENV="production"
PORT=4000
FRONTEND_URL="http://$(curl -s ifconfig.me)"
APP_URL="http://$(curl -s ifconfig.me)"
ENVEOF

# 12. Настройка Nginx (базовая, по IP)
echo "=== Configuring Nginx ==="
SERVER_IP=$(curl -s ifconfig.me)
cat > /etc/nginx/sites-available/money << NGINXEOF
server {
    listen 80;
    server_name $SERVER_IP;

    location / {
        root $APP_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    location /api {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /docs {
        alias $APP_DIR/docs/build;
        try_files \$uri \$uri/ /docs/index.html;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/money /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 13. Firewall
echo "=== Configuring firewall ==="
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# 14. Сборка приложения
echo "=== Building application ==="
cd $APP_DIR/backend
npm ci
npx prisma migrate deploy
npx prisma db seed
npm run build

cd $APP_DIR/frontend
npm ci
npm run build

cd $APP_DIR/docs
npm ci
npm run build

# 15. Запуск PM2
echo "=== Starting PM2 ==="
pm2 start $APP_DIR/backend/dist/main.js --name money-backend
pm2 save
pm2 startup systemd -u root --hp /root

echo ""
echo "=========================================="
echo "=== Setup completed! ==="
echo "=========================================="
echo ""
echo "App URL: http://$SERVER_IP"
echo "API URL: http://$SERVER_IP/api"
echo "Docs: http://$SERVER_IP/docs"
echo ""
echo "Database password saved in: $APP_DIR/backend/.env"
echo ""
echo "Next steps:"
echo "1. Add domain and run: certbot --nginx -d yourdomain.com"
echo "2. Update FRONTEND_URL in $APP_DIR/backend/.env"
echo "3. pm2 restart money-backend"
