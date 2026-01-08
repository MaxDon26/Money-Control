#!/bin/bash
# Скрипт первичной настройки VPS для Money Control
# Запускать от root или с sudo

set -e

echo "=== Money Control Server Setup ==="

# Переменные (измените под себя)
APP_DIR="/var/www/money"
APP_USER="deploy"
DOMAIN="money.example.com"  # Замените на свой домен

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

# 7. Создание пользователя для деплоя
echo "=== Creating deploy user ==="
if ! id "$APP_USER" &>/dev/null; then
    useradd -m -s /bin/bash $APP_USER
    mkdir -p /home/$APP_USER/.ssh
    # Скопируйте сюда свой публичный ключ
    # echo "ssh-rsa AAAA..." >> /home/$APP_USER/.ssh/authorized_keys
    chown -R $APP_USER:$APP_USER /home/$APP_USER/.ssh
    chmod 700 /home/$APP_USER/.ssh
    chmod 600 /home/$APP_USER/.ssh/authorized_keys
fi

# 8. Создание директории приложения
echo "=== Creating app directory ==="
mkdir -p $APP_DIR
chown -R $APP_USER:$APP_USER $APP_DIR

# 9. Настройка PostgreSQL
echo "=== Configuring PostgreSQL ==="
sudo -u postgres psql <<EOF
CREATE USER money_user WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE money_db OWNER money_user;
GRANT ALL PRIVILEGES ON DATABASE money_db TO money_user;
EOF

# 10. Настройка Nginx
echo "=== Configuring Nginx ==="
cat > /etc/nginx/sites-available/money <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Frontend (SPA)
    location / {
        root $APP_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;

        # Кэширование статики
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Документация (Docusaurus)
    location /docs {
        alias $APP_DIR/docs/build;
        try_files \$uri \$uri/ /docs/index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/money /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 11. Firewall
echo "=== Configuring firewall ==="
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

echo "=== Setup completed ==="
echo ""
echo "Next steps:"
echo "1. Clone repository: sudo -u $APP_USER git clone <repo> $APP_DIR"
echo "2. Create .env file in $APP_DIR/backend/"
echo "3. Run: cd $APP_DIR/backend && npm ci && npx prisma migrate deploy && npm run build"
echo "4. Run: cd $APP_DIR/frontend && npm ci && npm run build"
echo "5. Start PM2: pm2 start $APP_DIR/backend/dist/main.js --name money-backend"
echo "6. Setup SSL: certbot --nginx -d $DOMAIN"
echo "7. Save PM2: pm2 save && pm2 startup"
