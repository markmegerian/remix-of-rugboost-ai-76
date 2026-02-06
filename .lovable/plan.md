
# Plan: Landing Page File List & Custom Domain Guide

## Overview
This plan provides a complete inventory of files required for standalone VPS deployment of the RugBoost landing page, plus adds comprehensive custom domain configuration instructions to the README.

---

## Part 1: Complete File Inventory for Standalone Landing Page

### Core Configuration Files
```text
index.html                    # HTML entry point with SEO meta tags
vite.config.ts               # Vite build configuration
tailwind.config.ts           # Tailwind CSS configuration
postcss.config.js            # PostCSS configuration
tsconfig.json                # TypeScript config (root)
tsconfig.app.json            # TypeScript app config
package.json                 # Dependencies and scripts
```

### Public Assets
```text
public/
  favicon.ico                # Site favicon
  manifest.json              # PWA manifest
  placeholder.svg            # Placeholder image
  robots.txt                 # Search engine directives
  (optional) pwa-192x192.png # PWA icons (if added)
  (optional) pwa-512x512.png
```

### Source Entry Points
```text
src/
  main.tsx                   # React entry point
  App.tsx                    # Router configuration
  App.css                    # (minimal, mostly unused)
  index.css                  # Global styles, CSS variables, TipTap styles
  vite-env.d.ts              # Vite type declarations
```

### Landing Page Components
```text
src/pages/
  LandingPage.tsx            # Main landing page
  BlogPage.tsx               # Blog listing + individual post pages
  BlogAdmin.tsx              # Blog CMS admin panel
  PrivacyPolicy.tsx          # Privacy policy page
  TermsOfService.tsx         # Terms of service page
  Support.tsx                # Support/help center page
  NotFound.tsx               # 404 page
  Auth.tsx                   # Login/signup (for CTA links)

src/components/landing/
  GradientMeshBackground.tsx # Animated gradient background
  LandingBlog.tsx            # Blog preview section + data utilities
  LandingFAQ.tsx             # FAQ accordion section
  LandingFeatures.tsx        # Features grid section
  LandingFooter.tsx          # Footer with CTA and links
  LandingHero.tsx            # Hero section with device mockup
  LandingHowItWorks.tsx      # How it works steps
  LandingNavbar.tsx          # Navigation bar
  LandingPricing.tsx         # Pricing tiers section
  LandingProblemSolution.tsx # Problem/solution section
  LandingTestimonials.tsx    # Customer testimonials
  MobileCarousel.tsx         # Mobile screenshot carousel
```

### Device Mockup Components (for screenshots)
```text
src/components/screenshots/
  DeviceFrame.tsx            # Device frame wrapper (iPhone, iPad, etc.)
  MockAnalysisReport.tsx     # Mock AI analysis UI
  MockAnalytics.tsx          # Mock analytics dashboard
  MockClientPortal.tsx       # Mock client portal UI
  MockDashboard.tsx          # Mock main dashboard
  MockEstimate.tsx           # Mock estimate view
  MockPhotoCapture.tsx       # Mock photo capture UI
  ScreenshotSlide.tsx        # Carousel slide component
```

### Blog Editor Components
```text
src/components/blog/
  RichTextEditor.tsx         # TipTap WYSIWYG editor
```

### Required UI Components (shadcn/ui)
```text
src/components/ui/
  accordion.tsx              # For FAQ
  button.tsx                 # Buttons throughout
  card.tsx                   # Card containers
  input.tsx                  # Form inputs
  label.tsx                  # Form labels
  separator.tsx              # Dividers
  switch.tsx                 # Toggle switches
  textarea.tsx               # Multi-line inputs
  dropdown-menu.tsx          # Table menu in editor
```

### Hooks
```text
src/hooks/
  useScrollAnimation.ts      # Intersection observer animations
```

### Utilities
```text
src/lib/
  utils.ts                   # cn() utility for class merging
```

### Assets
```text
src/assets/
  rugboost-logo.svg          # Brand logo (required)
  appstore-mockup-1.png      # (optional, for hero if used)
```

### Integrations (minimal for landing-only)
```text
src/integrations/
  lovable/
    index.ts                 # Lovable Cloud AI client (for full app)
  supabase/
    client.ts                # Supabase client (for blog persistence if needed)
    types.ts                 # Database types
```

---

## Part 2: README Updates

The README will be updated to include:

1. **Standalone Landing Page Deployment Section** - Clear instructions for deploying just the landing page
2. **Custom Domain Configuration Guide** - Step-by-step DNS setup for popular registrars
3. **SSL Certificate Setup** - Instructions for Let's Encrypt/Certbot
4. **Nginx/Apache Configuration Examples** - Production-ready server configs

### New README Sections to Add

```markdown
## Standalone Landing Page Deployment

For deploying only the marketing landing page (without the full application):

### Quick Deploy
\`\`\`sh
npm run build
# Upload dist/ folder to your VPS
\`\`\`

### Required Files
The landing page is self-contained and includes:
- Marketing pages (/landing, /blog, /support, /privacy, /terms)
- Blog CMS at /blog-admin (stores posts in localStorage)
- Device mockups for product screenshots

### Minimal Dependencies
The landing page uses localStorage for blog posts, making it fully 
standalone without backend requirements.

---

## Custom Domain Configuration

### Step 1: DNS Configuration

Add the following DNS records at your domain registrar:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | [Your VPS IP] | 3600 |
| A | www | [Your VPS IP] | 3600 |
| CNAME | www | yourdomain.com | 3600 |

### Step 2: SSL Certificate (Let's Encrypt)

\`\`\`sh
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
\`\`\`

### Step 3: Nginx Configuration

Create `/etc/nginx/sites-available/rugboost`:

\`\`\`nginx
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
\`\`\`

Enable the site:
\`\`\`sh
sudo ln -s /etc/nginx/sites-available/rugboost /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
\`\`\`

### Apache Alternative

\`\`\`apache
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
\`\`\`

### Common Domain Registrars

**Cloudflare**
1. Go to DNS settings
2. Add A record: @ → Your VPS IP (Proxied or DNS only)
3. Add CNAME: www → yourdomain.com

**Namecheap**
1. Domain List → Manage → Advanced DNS
2. Add A Record: Host @ → Your VPS IP
3. Add CNAME: Host www → yourdomain.com

**GoDaddy**
1. My Products → DNS
2. Add A Record: Name @ → Your VPS IP
3. Add CNAME: Name www → yourdomain.com

### Troubleshooting

- **DNS Propagation**: Allow 24-48 hours for global propagation
- **SSL Issues**: Ensure ports 80 and 443 are open in firewall
- **404 Errors**: Verify the SPA fallback rule is configured
- **Check DNS**: Use `dig yourdomain.com` or https://dnschecker.org
```

---

## Implementation Steps

1. **Update README.md** - Add the new deployment and custom domain sections after the existing Mobile Apps section
2. **Keep existing content** - Preserve all current README sections
3. **Test build** - Verify `npm run build` produces a complete dist folder

---

## Technical Notes

- The landing page stores blog posts in `localStorage`, making it fully standalone
- Device mockups are self-contained React components (no external images required)
- All fonts are loaded from Google Fonts CDN
- The favicon uses an external URL in index.html (consider hosting locally for full independence)
