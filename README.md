# Azure AD SSO Customer Portal - Complete Setup Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Azure AD Configuration](#azure-ad-configuration)
3. [Project Setup](#project-setup)
4. [File Structure](#file-structure)
5. [Installation Steps](#installation-steps)
6. [Configuration](#configuration)
7. [Running the Application](#running-the-application)
8. [Deploying to VM](#deploying-to-vm)
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
       - URI: `http://localhost:3000/redirect`
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

6. **Add Production Redirect URI (Later)**
   - When deploying to VM, return here
   - Add additional redirect URI: `https://your-domain.com/redirect`

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
├── server.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

### Step 4: Create Directories

```bash
mkdir views
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
```

### Step 6: Create Environment File

Create `.env` file with your Azure credentials:

```env
# Azure AD Configuration
AZURE_CLIENT_ID=paste-your-client-id-here
AZURE_TENANT_ID=paste-your-tenant-id-here
AZURE_CLIENT_SECRET=paste-your-client-secret-here

# Server Configuration
PORT=3000
NODE_ENV=development

# Session Secret (generate a random string)
SESSION_SECRET=change-this-to-a-random-secret-key

# Redirect URIs (for local development)
REDIRECT_URI=http://localhost:3000/redirect
POST_LOGOUT_REDIRECT_URI=http://localhost:3000

# For Production VM (uncomment and update when deploying)
# REDIRECT_URI=https://your-vm-domain.com/redirect
# POST_LOGOUT_REDIRECT_URI=https://your-vm-domain.com
# NODE_ENV=production
```

**IMPORTANT**: Replace placeholders with actual values from Azure AD!

---

## Configuration

### Step 7: Create server.js

See attached artifact for complete `server.js` code.

### Step 8: Create View Files

Create all 5 EJS view files in the `views/` directory:
- `home.ejs` - Landing page
- `dashboard.ejs` - Main dashboard
- `profile.ejs` - User profile
- `invoices.ejs` - Billing history
- `support.ejs` - Support tickets

See attached artifacts for complete view code.

---

## Running the Application

### Step 9: Start the Server

```bash
# Development mode
node server.js

# Or with nodemon (auto-restart on changes)
npm install -g nodemon
nodemon server.js
```

### Step 10: Test Authentication

1. **Open browser**: http://localhost:3000
2. **Click "Sign In"**
3. **Login with Microsoft credentials**
4. **You should be redirected to dashboard**

### Expected Flow:

```
Home Page → Click Sign In → Microsoft Login → 
Enter Credentials → Redirect Back → Dashboard ✓
```

---

## Deploying to VM

### Step 11: Prepare VM Environment

```bash
# SSH into your VM
ssh user@your-vm-ip

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install nginx (reverse proxy)
sudo apt-get install nginx
```

### Step 12: Transfer Files to VM

```bash
# From your local machine
scp -r customer-portal/ user@your-vm-ip:/home/user/

# Or use Git
git init
git add .
git commit -m "Initial commit"
git push origin main

# Then on VM
git clone your-repo-url
cd customer-portal
npm install
```

### Step 13: Configure Production Environment

On the VM, update `.env`:

```env
AZURE_CLIENT_ID=your-client-id
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_SECRET=your-client-secret

PORT=3000
NODE_ENV=production

SESSION_SECRET=strong-production-secret

# Production URLs
REDIRECT_URI=https://your-domain.com/redirect
POST_LOGOUT_REDIRECT_URI=https://your-domain.com
```

### Step 14: Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/customer-portal`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/customer-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 15: Install SSL Certificate (Required for Production)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

### Step 16: Setup PM2 (Process Manager)

```bash
# Install PM2
sudo npm install -g pm2

# Start application
pm2 start server.js --name customer-portal

# Enable startup on boot
pm2 startup
pm2 save
```

### Step 17: Update Azure AD Redirect URI

1. Go back to Azure Portal → App registrations
2. Add new redirect URI: `https://your-domain.com/redirect`
3. Save changes

---

## Troubleshooting

### Common Issues:

**1. "Login failed" Error**
- ✅ Check `.env` values match Azure AD
- ✅ Verify redirect URI matches exactly
- ✅ Ensure client secret hasn't expired

**2. "Cannot GET /redirect" or 404**
- ✅ Check server is running
- ✅ Verify route is defined in server.js
- ✅ Check console for errors

**3. Session Lost After Redirect**
- ✅ Install express-session: `npm install express-session`
- ✅ Check SESSION_SECRET is set in .env
- ✅ Verify cookies are enabled in browser

**4. CORS/Cookie Issues on VM**
- ✅ Ensure HTTPS is configured
- ✅ Set `NODE_ENV=production` in .env
- ✅ Check nginx proxy headers

**5. "Invalid state parameter"**
- ✅ Session middleware must be before routes
- ✅ Clear browser cookies and try again
- ✅ Check session storage is working

### Debug Mode:

Add to server.js for debugging:

```javascript
app.use((req, res, next) => {
  console.log('Request:', req.method, req.path);
  console.log('Session:', req.session);
  next();
});
```

---

## Testing Checklist

Before going live:

- [ ] Can access home page
- [ ] Sign in redirects to Microsoft
- [ ] Can login with Microsoft credentials
- [ ] Dashboard loads after login
- [ ] Can access profile page
- [ ] Can access invoices page
- [ ] Can access support page
- [ ] Can create support ticket
- [ ] Logout works correctly
- [ ] Cannot access protected routes when logged out
- [ ] HTTPS working on production
- [ ] SSL certificate valid

---

## Security Best Practices

1. **Never commit .env file** - Add to .gitignore
2. **Use strong SESSION_SECRET** - Generate random 32+ character string
3. **Enable HTTPS in production** - Required by Azure AD
4. **Rotate client secrets** - Set expiration and rotate before expiry
5. **Keep dependencies updated** - Run `npm audit` regularly
6. **Use environment variables** - Never hardcode secrets
7. **Implement rate limiting** - Prevent brute force attacks

---

## Useful Commands

```bash
# Check if server is running
curl http://localhost:3000

# View PM2 logs
pm2 logs customer-portal

# Restart application
pm2 restart customer-portal

# Check nginx status
sudo systemctl status nginx

# View nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test SSL certificate
curl -I https://your-domain.com
```

---

## Support & Resources

- **Azure AD Documentation**: https://docs.microsoft.com/azure/active-directory
- **MSAL Node.js**: https://github.com/AzureAD/microsoft-authentication-library-for-js
- **Express.js Docs**: https://expressjs.com
- **PM2 Documentation**: https://pm2.keymetrics.io

---

## Author

Created for Azure AD SSO integration tutorial