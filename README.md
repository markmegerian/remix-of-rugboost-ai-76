# RugBoost - AI-Powered Rug Inspection Platform

## About

RugBoost is an AI-powered rug inspection and business management platform designed for professional rug cleaning businesses. Core features include:

- AI-powered rug type, origin, and condition identification
- Automated estimates based on rug analysis
- Full job lifecycle management (intake to delivery)
- Client portal for estimate approvals and payments
- Mobile-optimized interface with native iOS/Android app support

## Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Supabase (Auth, Database, Edge Functions, Storage)
- **AI**: Google Gemini Vision API
- **Payments**: Stripe
- **Mobile**: Capacitor (iOS/Android)

## Getting Started

### Prerequisites

- Node.js 18+ & npm
- Supabase project (for backend functionality)

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd rugboost

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Environment Variables

Create a `.env` file with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

## Deployment

### Web Deployment

Build the production bundle:

```sh
npm run build
```

Deploy the `dist` folder to your preferred hosting platform (Vercel, Netlify, VPS, etc.).

### Mobile Apps

The project uses Capacitor for native mobile builds:

```sh
# Add iOS platform
npx cap add ios

# Add Android platform  
npx cap add android

# Sync web assets
npx cap sync

# Open in Xcode (iOS)
npx cap open ios

# Open in Android Studio (Android)
npx cap open android
```

---

## Standalone Landing Page Deployment

For deploying only the marketing landing page (without the full application):

### Quick Deploy

```sh
npm run build
# Upload dist/ folder to your VPS
```

### Required Files

The landing page is self-contained and includes:
- Marketing pages (`/landing`, `/blog`, `/support`, `/privacy-policy`, `/terms-of-service`)
- Blog CMS at `/blog-admin` (stores posts in localStorage)
- Device mockups for product screenshots

### File Inventory

#### Core Configuration
```
index.html, vite.config.ts, tailwind.config.ts, postcss.config.js
tsconfig.json, tsconfig.app.json, package.json
```

#### Public Assets
```
public/favicon.ico, public/manifest.json, public/robots.txt, public/placeholder.svg
```

#### Landing Components
```
src/pages/LandingPage.tsx, src/pages/BlogPage.tsx, src/pages/BlogAdmin.tsx
src/pages/PrivacyPolicy.tsx, src/pages/TermsOfService.tsx, src/pages/Support.tsx

src/components/landing/*.tsx (all landing section components)
src/components/screenshots/*.tsx (device mockup components)
src/components/blog/RichTextEditor.tsx
```

#### Required UI & Utilities
```
src/components/ui/{accordion,button,card,input,label,separator,switch,textarea}.tsx
src/hooks/useScrollAnimation.ts
src/lib/utils.ts
src/assets/rugboost-logo.svg
```

### Minimal Dependencies

The landing page uses localStorage for blog posts, making it fully standalone without backend requirements.

---

## Custom Domain Configuration

### Step 1: DNS Configuration

Add the following DNS records at your domain registrar:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | [Your VPS IP] | 3600 |
| A | www | [Your VPS IP] | 3600 |

### Step 2: SSL Certificate (Let's Encrypt)

```sh
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
```

### Step 3: Nginx Configuration

Create `/etc/nginx/sites-available/rugboost`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    root /var/www/rugboost/dist;
    index index.html;

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

Enable the site:

```sh
sudo ln -s /etc/nginx/sites-available/rugboost /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Apache Alternative

```apache
<VirtualHost *:443>
    ServerName yourdomain.com
    DocumentRoot /var/www/rugboost/dist

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/yourdomain.com/privkey.pem

    <Directory /var/www/rugboost/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # SPA routing
    FallbackResource /index.html

    # Compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/css application/javascript
    </IfModule>
</VirtualHost>
```

### Common Domain Registrars

**Cloudflare**
1. Go to DNS settings
2. Add A record: `@` → Your VPS IP (Proxied or DNS only)
3. Add A record: `www` → Your VPS IP

**Namecheap**
1. Domain List → Manage → Advanced DNS
2. Add A Record: Host `@` → Your VPS IP
3. Add A Record: Host `www` → Your VPS IP

**GoDaddy**
1. My Products → DNS
2. Add A Record: Name `@` → Your VPS IP
3. Add A Record: Name `www` → Your VPS IP

### Troubleshooting

- **DNS Propagation**: Allow 24-48 hours for global propagation
- **SSL Issues**: Ensure ports 80 and 443 are open in firewall
- **404 Errors**: Verify the SPA fallback rule (`try_files` or `FallbackResource`) is configured
- **Check DNS**: Use `dig yourdomain.com` or https://dnschecker.org

---

## License

Copyright © 2024 RugBoost. All rights reserved.
