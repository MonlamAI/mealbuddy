# MealBuddy Operations & Deployment Guide

This guide describes how to provision, configure, and operate the MealBuddy application in a production environment using your newly created Continuous Delivery (CD) pipeline.

```mermaid
graph TD
    subgraph GitHub Repository
        A["Developer Push to main"] --> B["GitHub Actions Runner"]
        B --> C["CI Validation: Lint & Pest Tests"]
    end
    C -->|On Success| D{"Deployment Strategy"}
    D -->|Docker - Default| E["Build & Push Frontend/Backend Images to GHCR"]
    E --> F["SSH Hook: Execute deploy-docker.sh"]
    F --> G["VPS Server: docker compose pull & up -d"]
    D -->|Traditional SSH| H["SSH Hook: Execute deploy-ssh.sh"]
    H --> I["VPS Server: git pull, composer, npm install & build"]
```

---

## 🔑 GitHub Actions Repository Secrets

To activate the CD pipeline, configure the following secrets under **Settings > Secrets and variables > Actions** in your GitHub repository:

| Secret Name | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `SSH_HOST` | **Yes** | Public IP address or domain name of your production server | `192.168.10.45` or `mealbuddy.com` |
| `SSH_USERNAME` | **Yes** | SSH user authorized to log in and deploy | `ubuntu`, `root`, or `deploy` |
| `SSH_PRIVATE_KEY` | **Yes** | Private SSH Key (RSA/Ed25519) of the user | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SSH_PORT` | No | SSH port (defaults to `22` if not specified) | `22` or `2222` |
| `DEPLOY_STRATEGY` | No | Target strategy: set `ssh` for traditional; omit/leave empty for Docker | `ssh` |

---

## 🐳 Option A: Docker Deployment Setup (Recommended)

Docker provides isolation, consistency, and extremely fast, zero-downtime updates.

### 1. Prerequisite Packages (Run on VPS)
Install Docker and Docker Compose on your Ubuntu server:
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

### 2. Initializing Code on the VPS
Clone the repository and set up the directories on your server:
```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone https://github.com/your-username/mealbuddy.git
```

### 3. Server Configuration File (.env)
Create the configuration `.env` file in the root project directory:
```bash
cd /var/www/mealbuddy
cp .env.example .env
```
Update `.env` values (especially database passwords).

---

## 🖥️ Option B: Traditional SSH Git-Pull Setup

If you prefer to run PHP 8.4 and Node.js directly on the virtual server OS without Docker containerization.

### 1. Prerequisites (Run on VPS)
Install PHP 8.4, PostgreSQL client, Composer, and Node.js on the server:
```bash
# Add PHP PPA
sudo add-apt-repository ppa:ondrej/php -y
sudo apt-get update

# Install PHP 8.4 & Extensions
sudo apt-get install -y php8.4-cli php8.4-fpm php8.4-pgsql php8.4-intl php8.4-zip php8.4-curl php8.4-xml php8.4-mbstring php8.4-gd php8.4-bcmath unzip git curl

# Install Composer
curl -sS https://getcomposer.org/installer | sudo php -- --install-dir=/usr/local/bin --filename=composer

# Install Node & PM2
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

### 2. Server Configuration File
Set up your `.env` configs inside `/var/www/mealbuddy/backend/.env` and `/var/www/mealbuddy/frontend/.env.local`.

---

## 🔒 Nginx Reverse Proxy & SSL (HTTPS) Configuration

To serve your frontend (running on port 3000) and your backend (running on port 8000) securely under a single domain (or subdomains).

### 1. Unified Domain Configuration File
Create an Nginx configuration file at `/etc/nginx/sites-available/mealbuddy`:
```nginx
server {
    listen 80;
    server_name mealbuddy.com www.mealbuddy.com;

    # Frontend Next.js reverse proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API requests routing
    location /api {
        proxy_pass http://localhost:8000/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend Filament admin routing
    location /admin {
        proxy_pass http://localhost:8000/admin;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration:
```bash
sudo ln -s /etc/nginx/sites-available/mealbuddy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2. Adding SSL Certificates via Certbot (Let's Encrypt)
Run Certbot to automate SSL certificates and redirect all HTTP traffic to HTTPS:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d mealbuddy.com -d www.mealbuddy.com
```

---

## 💾 Automated Database Backups

It is crucial to automate daily database backups in production. Add a cron job to dump the database to your home directory or secure cloud storage.

### 1. Docker Backup Script
```bash
#!/usr/bin/env bash
BACKUP_DIR="/var/backups/mealbuddy"
mkdir -p "$BACKUP_DIR"
docker compose exec -T postgres pg_dump -U mealbuddy -d mealbuddy | gzip > "$BACKUP_DIR/backup-$(date +%F-%H%M%S).sql.gz"
# Keep backups for 30 days
find "$BACKUP_DIR" -type f -mtime +30 -delete
```

### 2. Cron Configuration
Add to crontab via `crontab -e`:
```cron
0 2 * * * /var/www/mealbuddy/scripts/backup-db.sh >> /var/log/mealbuddy-backup.log 2>&1
```

---

## 🛠️ Pipeline Troubleshooting

> [!WARNING]
> - **Permission Denied (`deploy-docker.sh` / `deploy-ssh.sh`)**: If you receive a permission error in GitHub Actions logs, ensure the script is marked executable locally:
>   `git update-index --chmod=+x scripts/deploy-docker.sh scripts/deploy-ssh.sh`
> - **SSH Connection Timeout**: Double-check that your server's firewall (e.g. AWS Security Group or UFW) allows SSH traffic from GitHub Actions IP ranges or that the IP in `SSH_HOST` is reachable.
