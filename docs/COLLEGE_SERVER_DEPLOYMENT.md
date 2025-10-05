# College Server Deployment Guide

## Overview
This guide covers deploying the BootFeet 2K26 Symposium Management System on your college's local server for fast, reliable access independent of internet speed. This deployment includes full offline capabilities and local database management.

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│         College Network (LAN)               │
│                                             │
│  ┌──────────────┐    ┌──────────────────┐  │
│  │   Server     │    │   PostgreSQL     │  │
│  │   Node.js    │───▶│   Database       │  │
│  │   App        │    │   (Local)        │  │
│  └──────────────┘    └──────────────────┘  │
│         │                                   │
│         │ HTTP/WebSocket                    │
│         ▼                                   │
│  ┌──────────────────────────────────────┐  │
│  │  Client Devices (Participants)       │  │
│  │  - Lab Computers                     │  │
│  │  - Student Laptops                   │  │
│  │  - Faculty Workstations              │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Benefits**:
- ⚡ Lightning-fast loading (LAN speeds)
- 🔒 Full control over data
- 📡 No dependency on internet
- 💾 Local database for data security
- 🔄 Real-time WebSocket support

---

## Prerequisites

### Hardware Requirements

**Minimum**:
- CPU: 4 cores
- RAM: 8 GB
- Storage: 50 GB SSD
- Network: Gigabit Ethernet

**Recommended**:
- CPU: 8+ cores
- RAM: 16+ GB
- Storage: 250 GB SSD (with RAID)
- Network: Gigabit Ethernet + UPS backup

### Software Requirements

- Operating System: Ubuntu Server 22.04 LTS (or similar Linux)
- Node.js 20.x
- PostgreSQL 15+
- Nginx (optional, for reverse proxy)
- PM2 (for process management)

---

## Step 1: Server Setup

### 1.1 Install Ubuntu Server

1. Download Ubuntu Server 22.04 LTS
2. Create bootable USB
3. Install on server hardware
4. Set static IP address

### 1.2 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Install Required Software

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x
npm --version

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx (optional, recommended)
sudo apt install -y nginx

# Install Git
sudo apt install -y git
```

---

## Step 2: PostgreSQL Setup

### 2.1 Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE symposium_db;
CREATE USER symposium_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE symposium_db TO symposium_user;
\q
```

### 2.2 Configure PostgreSQL for Local Network Access

Edit PostgreSQL configuration:

```bash
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Find and modify:
```conf
listen_addresses = '*'  # Listen on all interfaces
max_connections = 100   # Adjust based on expected load
```

Edit access control:

```bash
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

Add line (adjust IP range for your network):
```conf
host    all             all             192.168.1.0/24          md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 2.3 Create Database Connection String

```
postgresql://symposium_user:your_secure_password_here@localhost:5432/symposium_db
```

---

## Step 3: Clone and Configure Application

### 3.1 Clone Repository

```bash
# Create app directory
sudo mkdir -p /var/www
cd /var/www

# Clone from GitHub
sudo git clone https://github.com/your-username/symposium-app.git
sudo chown -R $USER:$USER symposium-app
cd symposium-app
```

### 3.2 Install Dependencies

```bash
npm install
```

### 3.3 Configure Environment Variables

Create `.env` file:

```bash
nano .env
```

Add configuration:
```env
# Database
DATABASE_URL=postgresql://symposium_user:your_secure_password_here@localhost:5432/symposium_db

# JWT Secret (generate using: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=your_64_character_hex_string_here

# Server
NODE_ENV=production
PORT=5000

# Email (Optional - for notifications)
SMTP_HOST=your_college_smtp_server.edu
SMTP_PORT=587
SMTP_USER=symposium@yourcollege.edu
SMTP_PASS=your_email_password
SMTP_FROM=BootFeet 2K26 <symposium@yourcollege.edu>
```

Secure the file:
```bash
chmod 600 .env
```

---

## Step 4: Initialize Database

### 4.1 Push Schema

```bash
npm run db:push
```

If you get errors, force push:
```bash
npm run db:push --force
```

### 4.2 Seed Database (Optional)

```bash
npm run seed
```

This creates:
- Super admin account
- Event admins
- Registration committee accounts
- Sample events and questions
- Test participants

**Test Credentials**:
- Super Admin: `superadmin` / `admin123`
- Event Admin: `eventadmin1` / `admin123`
- Reg Committee: `regcommittee1` / `admin123`

---

## Step 5: Build Application

```bash
npm run build
```

This creates production build in `dist/` directory.

---

## Step 6: Configure PM2 (Process Manager)

### 6.1 Create PM2 Ecosystem File

```bash
nano ecosystem.config.js
```

Add configuration:
```javascript
module.exports = {
  apps: [{
    name: 'symposium-app',
    script: 'dist/index.js',
    instances: 2,  // Use multiple instances for load balancing
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

### 6.2 Start Application with PM2

```bash
# Create logs directory
mkdir -p logs

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Enable PM2 to start on boot
pm2 startup
# Follow the command it suggests (will be sudo ...)

# Check status
pm2 status
pm2 logs
```

---

## Step 7: Configure Nginx (Reverse Proxy)

### 7.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/symposium
```

Add configuration:
```nginx
# WebSocket upgrade configuration
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

# Upstream Node.js application
upstream symposium_app {
    least_conn;
    server localhost:5000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name symposium.yourcollege.local 192.168.1.100;  # Adjust IP

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Increase timeouts for long-running tests
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
    send_timeout 600s;

    # Main application
    location / {
        proxy_pass http://symposium_app;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Caching
        proxy_cache_bypass $http_upgrade;
        proxy_no_cache $http_pragma $http_authorization;
    }

    # API specific location (optional, for different caching)
    location /api {
        proxy_pass http://symposium_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # No caching for API
        proxy_no_cache 1;
        proxy_cache_bypass 1;
    }

    # Socket.io WebSocket endpoint
    location /socket.io/ {
        proxy_pass http://symposium_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # WebSocket specific timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Static files (if serving separately)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://symposium_app;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
    }
}
```

### 7.2 Enable Nginx Configuration

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/symposium /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

---

## Step 8: Firewall Configuration

```bash
# Install UFW if not already installed
sudo apt install -y ufw

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS (if using SSL later)
sudo ufw allow 443/tcp

# Allow PostgreSQL from local network only
sudo ufw allow from 192.168.1.0/24 to any port 5432

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Step 9: Network Configuration

### 9.1 Set Static IP

Edit netplan configuration:
```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

Example configuration:
```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp0s3:  # Your interface name (check with 'ip a')
      addresses:
        - 192.168.1.100/24  # Your static IP
      gateway4: 192.168.1.1  # Your gateway
      nameservers:
        addresses:
          - 8.8.8.8  # Google DNS
          - 8.8.4.4
```

Apply changes:
```bash
sudo netplan apply
```

### 9.2 Configure DNS (Optional)

Add local DNS entry on your network's DNS server:
```
symposium.yourcollege.local  →  192.168.1.100
```

Or add to client `/etc/hosts` files:
```
192.168.1.100  symposium.yourcollege.local
```

---

## Step 10: SSL/TLS Configuration (Optional but Recommended)

### Using Self-Signed Certificate (for LAN)

```bash
# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Generate self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/symposium.key \
  -out /etc/nginx/ssl/symposium.crt

# Update Nginx config for HTTPS
sudo nano /etc/nginx/sites-available/symposium
```

Add HTTPS server block:
```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name symposium.yourcollege.local 192.168.1.100;

    ssl_certificate /etc/nginx/ssl/symposium.crt;
    ssl_certificate_key /etc/nginx/ssl/symposium.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Rest of configuration same as HTTP block
    # ... (copy from above)
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name symposium.yourcollege.local 192.168.1.100;
    return 301 https://$server_name$request_uri;
}
```

Restart Nginx:
```bash
sudo systemctl restart nginx
```

**Note**: Clients will see certificate warning (self-signed). Instruct them to proceed/add exception.

---

## Step 11: Monitoring and Maintenance

### 11.1 PM2 Monitoring

```bash
# View logs
pm2 logs symposium-app

# Monitor CPU/Memory
pm2 monit

# Restart app
pm2 restart symposium-app

# Stop app
pm2 stop symposium-app

# View detailed info
pm2 info symposium-app
```

### 11.2 PostgreSQL Monitoring

```bash
# Check database size
sudo -u postgres psql -c "\l+"

# Monitor connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Vacuum and analyze (weekly)
sudo -u postgres vacuumdb -z -d symposium_db
```

### 11.3 Nginx Monitoring

```bash
# Check status
sudo systemctl status nginx

# View access logs
sudo tail -f /var/log/nginx/access.log

# View error logs
sudo tail -f /var/log/nginx/error.log
```

---

## Step 12: Backup Strategy

### 12.1 Automated Database Backups

Create backup script:
```bash
sudo nano /usr/local/bin/backup-symposium-db.sh
```

Add script:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/symposium"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U symposium_user -h localhost symposium_db | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Keep only last 30 days of backups
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: db_backup_$DATE.sql.gz"
```

Make executable:
```bash
sudo chmod +x /usr/local/bin/backup-symposium-db.sh
```

Schedule with cron:
```bash
sudo crontab -e
```

Add daily backup at 2 AM:
```cron
0 2 * * * /usr/local/bin/backup-symposium-db.sh >> /var/log/symposium-backup.log 2>&1
```

### 12.2 Application Code Backup

```bash
# Backup application files
sudo tar -czf /var/backups/symposium/app_backup_$(date +%Y%m%d).tar.gz /var/www/symposium-app

# Keep only last 7 backups
find /var/backups/symposium -name "app_backup_*.tar.gz" -mtime +7 -delete
```

---

## Step 13: Client Access Instructions

### For Participants

1. **Connect to College Network** (WiFi or Ethernet)
2. **Open Browser** (Chrome, Firefox, or Edge)
3. **Navigate to**: `http://symposium.yourcollege.local` or `http://192.168.1.100`
4. **Login** with provided credentials

### Network Requirements

- Must be on the same LAN as server
- No internet connection required
- Recommended: Wired Ethernet for stability during tests

---

## Step 14: Performance Optimization

### 14.1 Node.js Tuning

Edit ecosystem.config.js:
```javascript
instances: 'max',  // Use all CPU cores
max_memory_restart: '2G',  // Increase if needed
```

### 14.2 PostgreSQL Tuning

Edit postgresql.conf:
```conf
shared_buffers = 2GB  # 25% of RAM
effective_cache_size = 6GB  # 75% of RAM
work_mem = 50MB
maintenance_work_mem = 512MB
max_connections = 200
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 14.3 Nginx Tuning

Edit nginx.conf:
```nginx
worker_processes auto;
worker_connections 4096;
keepalive_timeout 65;
client_max_body_size 20M;
```

---

## Step 15: Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs symposium-app --lines 100

# Check Node.js is installed
node --version

# Check .env file exists
ls -la /var/www/symposium-app/.env

# Manually run to see errors
cd /var/www/symposium-app
npm run start
```

### Database Connection Issues

```bash
# Test PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U symposium_user -h localhost -d symposium_db

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Nginx Issues

```bash
# Test Nginx config
sudo nginx -t

# Check if port 80 is available
sudo netstat -tulpn | grep :80

# Restart Nginx
sudo systemctl restart nginx
```

### WebSocket Not Working

- Check Nginx WebSocket configuration
- Verify PM2 is running in cluster mode
- Check firewall allows WebSocket connections
- Test with: `curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:5000/socket.io/`

---

## Step 16: Scaling for Large Events

### Load Balancing Multiple Servers

If you need more capacity:

1. Set up multiple application servers
2. Configure Nginx as load balancer
3. Use shared PostgreSQL database
4. Consider Redis for session storage

Example load balancer config:
```nginx
upstream symposium_cluster {
    least_conn;
    server 192.168.1.100:5000 weight=1;
    server 192.168.1.101:5000 weight=1;
    server 192.168.1.102:5000 weight=1;
}
```

---

## Security Checklist

- ✅ Strong database passwords
- ✅ JWT secret is 64+ characters
- ✅ Firewall configured (UFW)
- ✅ SSH key-based authentication only
- ✅ Regular security updates
- ✅ Database backups automated
- ✅ SSL/TLS configured (optional for LAN)
- ✅ Nginx security headers set
- ✅ Non-root user for application
- ✅ File permissions secured (chmod 600 .env)

---

## Maintenance Schedule

**Daily**:
- Check application logs
- Monitor PM2 status
- Verify backups completed

**Weekly**:
- Review error logs
- Check disk space
- Vacuum PostgreSQL database

**Monthly**:
- Update system packages
- Review security updates
- Test backup restoration
- Clean old log files

---

## Cost Estimation

**One-time**:
- Server Hardware: $500 - $2000
- UPS: $100 - $300
- Network Equipment: $50 - $200

**Recurring**:
- Electricity: ~$10-30/month
- Maintenance: Minimal (in-house IT)

**Total First Year**: ~$1000-2500
**Total Annual (after first year)**: ~$120-360

Much cheaper than cloud hosting for local use!

---

## Advantages of Local Deployment

1. **Speed**: LAN speeds (100-1000 Mbps vs 10-50 Mbps internet)
2. **Reliability**: No internet dependency
3. **Cost**: One-time hardware vs recurring cloud costs
4. **Data Control**: Full control over sensitive student data
5. **Security**: Data never leaves campus network
6. **Customization**: Full control over configuration

---

## Support

For issues specific to college server deployment:
1. Check this guide thoroughly
2. Review application logs
3. Check server system logs
4. Contact IT department for network issues
5. Refer to README.md for application-specific questions

---

## Next Steps

1. ✅ Complete server setup
2. ✅ Deploy application
3. ✅ Initialize database
4. ✅ Seed test data
5. ✅ Test from client devices
6. ✅ Configure monitoring
7. ✅ Set up automated backups
8. ✅ Document server details for IT team
9. ✅ Train staff on maintenance tasks
10. ✅ Create incident response plan

Your Symposium Management System is now running on your college server! 🎓🚀
