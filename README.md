# Azure AD SSO Customer Portal - Complete Setup Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Azure AD Configuration](#azure-ad-configuration)
3. [Project Setup](#project-setup)
4. [File Structure](#file-structure)
5. [Installation Steps](#installation-steps)
6. [Configuration](#configuration)
7. [Running the Application](#running-the-application)
8. [Deployment Options](#deployment-options)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js (v14 or higher) installed
- ✅ npm (comes with Node.js)
- ✅ Azure account with admin access
- ✅ Basic understanding of Node.js/Express
- ✅ Text editor (VS Code recommended)

---

## Azure AD Configuration

### Step 1: Create App Registration

1. **Login to Azure Portal**
   - Go to https://portal.azure.com
   - Navigate to "Azure Active Directory"

2. **Register New Application**
   - Click "App registrations" → "New registration"
   - Fill in:
     - **Name**: `Customer Portal`
     - **Supported account types**: `Accounts in this organizational directory only`
     - **Redirect URI**: 
       - Platform: `Web`
       - For local dev: `http://localhost:3000/redirect`
       - For VM POC: `https://YOUR_VM_IP/redirect`
   - Click "Register"

3. **Note Your Application (client) ID**
   - Copy the "Application (client) ID" (you'll need this)
   - Copy the "Directory (tenant) ID" (you'll need this)

4. **Create Client Secret**
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Description: `Customer Portal Secret`
   - Expires: Choose duration (recommended: 24 months)
   - Click "Add"
   - **IMPORTANT**: Copy the secret VALUE immediately (you can't see it again!)

5. **Configure API Permissions**
   - Go to "API permissions"
   - Default permissions should include:
     - `User.Read`
     - `openid`
     - `profile`
     - `email`
   - If missing, click "Add a permission" → "Microsoft Graph" → "Delegated permissions"
   - Click "Grant admin consent" (if you have admin rights)

6. **Add Multiple Redirect URIs**
   - Go to "Authentication"
   - Add all environments you'll use:
     - Local: `http://localhost:3000/redirect`
     - VM POC HTTP: `http://YOUR_VM_IP:3000/redirect`
     - VM POC HTTPS: `https://YOUR_VM_IP/redirect`
     - Production: `https://yourdomain.com/redirect`

---

## Project Setup

### Step 2: Create Project Directory

```bash
# Create project folder
mkdir customer-portal
cd customer-portal

# Initialize npm project
npm init -y
```

### Step 3: Install Dependencies

```bash
npm install express express-session ejs @azure/msal-node dotenv
```

**Package Explanations:**
- `express` - Web framework
- `express-session` - Session management
- `ejs` - Template engine for views
- `@azure/msal-node` - Microsoft Authentication Library
- `dotenv` - Environment variable management

---

## File Structure

Create the following directory structure:

```
customer-portal/
├── views/
│   ├── home.ejs
│   ├── dashboard.ejs
│   ├── profile.ejs
│   ├── invoices.ejs
│   └── support.ejs
├── certs/                  # Only for VM POC with self-signed cert
│   ├── key.pem            # Generated via OpenSSL
│   └── cert.pem           # Generated via OpenSSL
├── server.js
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

### Step 4: Create Directories

```bash
mkdir views
mkdir certs  # Only needed for VM POC with HTTPS
```

---

## Installation Steps

### Step 5: Create .gitignore

Create `.gitignore` file:

```
node_modules/
.env
.DS_Store
*.log
certs/
```

### Step 6: Create Environment Files

Create `.env.example` file as a template:

```env
# Azure AD Configuration
AZURE_CLIENT_ID=your-application-client-id-here
AZURE_TENANT_ID=your-directory-tenant-id-here
AZURE_CLIENT_SECRET=your-client-secret-value-here

# Server Configuration
PORT=3000
NODE_ENV=development
USE_HTTPS=false

# SSL Certificates (only for VM POC with HTTPS)
SSL_KEY_PATH=./certs/key.pem
SSL_CERT_PATH=./certs/cert.pem

# Session Secret (generate a random string)
SESSION_SECRET=your-random-session-secret-here

# Redirect URIs
REDIRECT_URI=http://localhost:3000/redirect
POST_LOGOUT_REDIRECT_URI=http://localhost:3000
```

---

## Configuration

### Step 7: Environment-Specific Configuration

Create different `.env` files for each environment:

#### **Local Development (.env):**
```env
# Azure AD
AZURE_CLIENT_ID=paste-your-client-id-here
AZURE_TENANT_ID=paste-your-tenant-id-here
AZURE_CLIENT_SECRET=paste-your-client-secret-here

# Server - HTTP for local dev
PORT=3000
NODE_ENV=development
USE_HTTPS=false

# Session
SESSION_SECRET=dev-secret-key-change-this

# Redirect URIs - HTTP localhost
REDIRECT_URI=http://localhost:3000/redirect
POST_LOGOUT_REDIRECT_URI=http://localhost:3000
```

#### **VM POC - HTTP (.env.vm-http):**
```env
# Azure AD
AZURE_CLIENT_ID=paste-your-client-id-here
AZURE_TENANT_ID=paste-your-tenant-id-here
AZURE_CLIENT_SECRET=paste-your-client-secret-here

# Server - HTTP on port 3000
PORT=3000
NODE_ENV=production
USE_HTTPS=false

# Session
SESSION_SECRET=strong-production-secret

# Redirect URIs - HTTP with VM IP
REDIRECT_URI=http://YOUR_VM_IP:3000/redirect
POST_LOGOUT_REDIRECT_URI=http://YOUR_VM_IP:3000
```

#### **VM POC - HTTPS Self-Signed (.env.vm-https):**
```env
# Azure AD
AZURE_CLIENT_ID=paste-your-client-id-here
AZURE_TENANT_ID=paste-your-tenant-id-here
AZURE_CLIENT_SECRET=paste-your-client-secret-here

# Server - HTTPS on port 443
PORT=443
NODE_ENV=production
USE_HTTPS=true

# SSL Certificates
SSL_KEY_PATH=./certs/key.pem
SSL_CERT_PATH=./certs/cert.pem

# Session
SESSION_SECRET=strong-production-secret

# Redirect URIs - HTTPS with VM IP
REDIRECT_URI=https://YOUR_VM_IP/redirect
POST_LOGOUT_REDIRECT_URI=https://YOUR_VM_IP
```

#### **Production with Nginx (.env.production):**
```env
# Azure AD
AZURE_CLIENT_ID=paste-your-client-id-here
AZURE_TENANT_ID=paste-your-tenant-id-here
AZURE_CLIENT_SECRET=paste-your-client-secret-here

# Server - HTTP on port 3000 (Nginx handles HTTPS on 443)
PORT=3000
NODE_ENV=production
USE_HTTPS=false

# Session
SESSION_SECRET=strong-production-secret

# Redirect URIs - HTTPS with domain
REDIRECT_URI=https://yourdomain.com/redirect
POST_LOGOUT_REDIRECT_URI=https://yourdomain.com
```

### Step 8: Generate Session Secret

```bash
# Generate a random session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output to SESSION_SECRET in .env
```

---

## Running the Application

### Step 9: Local Development (HTTP)

```bash
# Make sure .env is configured for local dev
# USE_HTTPS=false
# PORT=3000
# REDIRECT_URI=http://localhost:3000/redirect

# Start the server
node server.js

# Or with nodemon for auto-reload
npm install -g nodemon
nodemon server.js

# Access at: http://localhost:3000
```

### Step 10: VM POC with Self-Signed Certificate (HTTPS)

```bash
# 1. Generate self-signed certificate
mkdir certs && cd certs
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/CN=YOUR_VM_IP" \
  -addext "subjectAltName=IP:YOUR_VM_IP"
cd ..

# 2. Configure .env for HTTPS
# USE_HTTPS=true
# PORT=443
# REDIRECT_URI=https://YOUR_VM_IP/redirect

# 3. Install authbind (to run on port 443 without sudo)
sudo apt-get install authbind
sudo touch /etc/authbind/byport/443
sudo chmod 500 /etc/authbind/byport/443
sudo chown $USER /etc/authbind/byport/443

# 4. Start server with authbind
authbind --deep node server.js

# 5. Access at: https://YOUR_VM_IP
# Note: Browser will show security warning - click "Advanced" → "Proceed"
```

### Step 11: VM POC with HTTP (Simpler for Testing)

```bash
# 1. Configure .env for HTTP
# USE_HTTPS=false
# PORT=3000
# REDIRECT_URI=http://YOUR_VM_IP:3000/redirect

# 2. Start server
node server.js

# 3. Access at: http://YOUR_VM_IP:3000
```

---

## Deployment Options

### Option 1: VM POC with Self-Signed HTTPS (Port 443)

**Use this for**: Quick POC without domain, direct HTTPS access

**Pros**: 
- No domain needed
- Direct HTTPS on port 443
- Simple setup

**Cons**:
- Browser security warnings
- Self-signed certificate not trusted
- Must run with elevated permissions

**Setup:**
```bash
# Generate certificate
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem \
  -days 365 -nodes -subj "/CN=YOUR_VM_IP" -addext "subjectAltName=IP:YOUR_VM_IP"

# Configure .env
USE_HTTPS=true
PORT=443
REDIRECT_URI=https://YOUR_VM_IP/redirect

# Run
authbind --deep node server.js
```

---

### Option 2: VM POC with HTTP (Port 3000)

**Use this for**: Quick testing without SSL complexity

**Pros**:
- No certificates needed
- No browser warnings
- Easy to debug

**Cons**:
- Not production-ready
- Azure AD may show warnings
- Less secure

**Setup:**
```bash
# Configure .env
USE_HTTPS=false
PORT=3000
REDIRECT_URI=http://YOUR_VM_IP:3000/redirect

# Run
node server.js
```

---

### Option 3: Production with Nginx + Let's Encrypt (Recommended)

**Use this for**: Production deployment with proper domain

**Pros**:
- Trusted SSL certificate
- Industry standard
- Better performance
- No browser warnings

**Cons**:
- Requires domain name
- More complex setup

**Setup:**

#### Install Nginx:
```bash
sudo apt-get update
sudo apt-get install nginx
```

#### Configure Nginx (`/etc/nginx/sites-available/customer-portal`):
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL managed by Certbot
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Proxy to Node.js on port 3000
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Enable Site:
```bash
sudo ln -s /etc/nginx/sites-available/customer-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Get SSL Certificate:
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

#### Configure .env:
```env
USE_HTTPS=false  # Node.js uses HTTP, Nginx handles HTTPS
PORT=3000
REDIRECT_URI=https://yourdomain.com/redirect
```

#### Start Application:
```bash
# Install PM2 for process management
sudo npm install -g pm2

# Start application
pm2 start server.js --name customer-portal

# Enable startup on boot
pm2 startup
pm2 save
```

---

## Deployment Comparison

| Feature | VM POC HTTPS | VM POC HTTP | Production Nginx |
|---------|--------------|-------------|------------------|
| **SSL/TLS** | Self-signed | None | Let's Encrypt |
| **Port** | 443 | 3000 | 443 (Nginx) / 3000 (Node) |
| **Domain Required** | No | No | Yes |
| **Browser Warning** | Yes | No | No |
| **Setup Complexity** | Medium | Easy | Complex |
| **Production Ready** | No | No | Yes |
| **Best For** | POC Demo | Quick Testing | Production |

---

## Troubleshooting

### Common Issues:

#### **1. "Login failed" or "Authentication error"**

**Check:**
```bash
# Verify .env values
cat .env

# Ensure all Azure values are set
grep -E "AZURE_CLIENT_ID|AZURE_TENANT_ID|AZURE_CLIENT_SECRET" .env

# Verify redirect URI matches Azure AD
echo $REDIRECT_URI
```

**Solution:**
- Ensure Client ID, Tenant ID, Secret match Azure Portal
- Verify redirect URI is exactly configured in Azure AD
- Check Azure AD app registration has correct permissions

---

#### **2. "Cannot access application on port 443"**

**Check:**
```bash
# Verify USE_HTTPS is set
grep USE_HTTPS .env

# Check if port 443 is in use
sudo lsof -i :443

# Verify certificates exist
ls -la certs/
```

**Solution:**
```bash
# Make sure USE_HTTPS=true in .env
# Generate certificates if missing
mkdir certs && cd certs
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/CN=YOUR_VM_IP" -addext "subjectAltName=IP:YOUR_VM_IP"
cd ..

# Use authbind for port 443
sudo apt-get install authbind
sudo touch /etc/authbind/byport/443
sudo chmod 500 /etc/authbind/byport/443
sudo chown $USER /etc/authbind/byport/443
authbind --deep node server.js
```

---

#### **3. Session lost after login**

**Check:**
```bash
# Verify express-session is installed
npm list express-session

# Check SESSION_SECRET is set
grep SESSION_SECRET .env
```

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install

# Generate new session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add to .env as SESSION_SECRET
```

---

#### **4. "Certificate not trusted" browser warning**

**This is expected with self-signed certificates in POC mode.**

**Options:**

1. **Accept the warning** (for POC only):
   - Chrome: Click "Advanced" → "Proceed to [IP] (unsafe)"
   - Firefox: Click "Advanced" → "Accept the Risk and Continue"

2. **Use HTTP instead** (easier for testing):
   ```env
   USE_HTTPS=false
   PORT=3000
   REDIRECT_URI=http://YOUR_VM_IP:3000/redirect
   ```

3. **Get proper certificate** (for production):
   - Use Let's Encrypt with domain name
   - Follow "Option 3: Production with Nginx" above

---

#### **5. "Port already in use"**

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find process using the port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3001 node server.js
```

---

#### **6. Redirect URI mismatch**

**Error in browser:**
```
AADSTS50011: The redirect URI specified in the request does not match
```

**Solution:**
1. Check your .env REDIRECT_URI value
2. Go to Azure Portal → App registrations → Authentication
3. Add exact redirect URI (must match exactly, including http/https)
4. Save and wait 1-2 minutes for propagation
5. Clear browser cache and try again

---

## Environment Variable Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `AZURE_CLIENT_ID` | ✅ Yes | Application (client) ID | `12345678-1234-...` |
| `AZURE_TENANT_ID` | ✅ Yes | Directory (tenant) ID | `87654321-4321-...` |
| `AZURE_CLIENT_SECRET` | ✅ Yes | Client secret value | `ABC123xyz...` |
| `SESSION_SECRET` | ✅ Yes | Random string for sessions | `a1b2c3d4e5...` |
| `PORT` | ❌ No | Server port (default: 3000) | `3000` or `443` |
| `NODE_ENV` | ❌ No | Environment mode | `development` or `production` |
| `USE_HTTPS` | ❌ No | Enable HTTPS in Node.js | `true` or `false` |
| `SSL_KEY_PATH` | ❌ No | SSL private key path | `./certs/key.pem` |
| `SSL_CERT_PATH` | ❌ No | SSL certificate path | `./certs/cert.pem` |
| `REDIRECT_URI` | ✅ Yes | OAuth callback URL | `http://localhost:3000/redirect` |
| `POST_LOGOUT_REDIRECT_URI` | ✅ Yes | Post-logout URL | `http://localhost:3000` |

---

## Security Checklist

Before deploying to production:

- [ ] Changed `SESSION_SECRET` to strong random string (32+ characters)
- [ ] Set `NODE_ENV=production` in .env
- [ ] Enabled HTTPS with proper certificate (not self-signed)
- [ ] Updated all redirect URIs in Azure AD
- [ ] Removed console.log statements with sensitive data
- [ ] Added `.env` and `certs/` to `.gitignore`
- [ ] Implemented rate limiting (optional but recommended)
- [ ] Set cookie `secure: true` for HTTPS
- [ ] Configured firewall rules
- [ ] Set up regular backups
- [ ] Reviewed and removed unnecessary exposed data (tenant ID, etc.)

---

## Quick Commands Reference

```bash
# Generate session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate self-signed certificate for VM POC
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem \
  -days 365 -nodes -subj "/CN=YOUR_VM_IP" -addext "subjectAltName=IP:YOUR_VM_IP"

# Run on port 443 with authbind
authbind --deep node server.js

# Run with PM2
pm2 start server.js --name customer-portal
pm2 logs customer-portal
pm2 restart customer-portal
pm2 stop customer-portal

# Check what's using a port
lsof -i :3000
lsof -i :443

# Test HTTPS
curl -k https://YOUR_VM_IP

# Test HTTP
curl http://YOUR_VM_IP:3000
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    DEPLOYMENT OPTIONS                    │
└─────────────────────────────────────────────────────────┘

Option 1: VM POC with Direct HTTPS (Port 443)
┌──────────────┐
│   Browser    │ → https://VM_IP:443
└──────────────┘
       ↓
┌──────────────┐
│   Node.js    │ (Port 443, USE_HTTPS=true)
│ + SSL Certs  │ (Self-signed)
└──────────────┘

Option 2: VM POC with HTTP (Port 3000)
┌──────────────┐
│   Browser    │ → http://VM_IP:3000
└──────────────┘
       ↓
┌──────────────┐
│   Node.js    │ (Port 3000, USE_HTTPS=false)
└──────────────┘

Option 3: Production with Nginx (Recommended)
┌──────────────┐
│   Browser    │ → https://domain.com:443
└──────────────┘
       ↓
┌──────────────┐
│    Nginx     │ (Port 443, SSL with Let's Encrypt)
│ Reverse Proxy│
└──────────────┘
       ↓
┌──────────────┐
│   Node.js    │ (Port 3000, USE_HTTPS=false)
└──────────────┘
```

---

## Support & Resources

- **Azure AD Documentation**: https://docs.microsoft.com/azure/active-directory
- **MSAL Node.js**: https://github.com/AzureAD/microsoft-authentication-library-for-js
- **Express.js**: https://expressjs.com
- **PM2**: https://pm2.keymetrics.io
- **Let's Encrypt**: https://letsencrypt.org


---

## Author

Created for Azure AD SSO integration tutorial
