

# App Store URL Pages Implementation Plan

## Overview
Apple App Store requires two specific URLs for your listing:
1. **Privacy Policy URL**: `https://app.rugboost.com/privacy`
2. **Support URL**: `https://app.rugboost.com`

Currently, the privacy policy exists at `/privacy-policy` and the root URL (`/`) just redirects users to login. We need to create proper pages for both URLs.

---

## What We'll Create

### 1. Privacy Route Alias (`/privacy`)
Add an additional route that serves the existing Privacy Policy page at the shorter `/privacy` URL that Apple expects.

### 2. Support/Landing Page (Root URL)
Transform the root URL from a redirect into a proper landing page that:
- Serves as the official Support page for App Store
- Provides contact information and help resources
- Includes links to Privacy Policy and Terms of Service
- Has clear call-to-action buttons for login/signup
- Works for unauthenticated visitors (Apple's reviewer)

---

## Implementation Details

### File Changes

**1. Create Support Page** (`src/pages/Support.tsx`)

A professional support landing page including:
- Hero section with Rugboost branding
- Contact information (email support)
- FAQ section covering common questions
- Links to legal pages (Privacy, Terms)
- Login/Sign up buttons for existing users
- Mobile-responsive design matching existing styling

**2. Update App.tsx Routing**

- Add `/privacy` as an alias route pointing to PrivacyPolicy
- Add `/support` route for the new Support page
- Update the root `/` route behavior to show Support page for unauthenticated users (or redirect authenticated users to their dashboard)

---

## Support Page Content

The support page will include:

**Contact Section**
- Support email: support@rugboost.com
- Business hours and response time expectations

**FAQ Section**
- How does AI rug analysis work?
- How do I manage my jobs?
- How do clients access their portal?
- Payment and billing questions

**Quick Links**
- Privacy Policy
- Terms of Service
- Sign In / Sign Up buttons

---

## Route Summary

| URL | Purpose | Audience |
|-----|---------|----------|
| `/privacy` | Privacy Policy (App Store link) | Apple, Users |
| `/privacy-policy` | Privacy Policy (existing) | Users |
| `/support` | Support page (direct link) | Users |
| `/` | Landing/Support (unauthenticated) or redirect (authenticated) | Everyone |

---

## Technical Details

**New Files:**
- `src/pages/Support.tsx` - Full support/landing page component

**Modified Files:**
- `src/App.tsx` - Add `/privacy` and `/support` routes, update `/` behavior

**Styling:**
- Uses existing Tailwind classes and design tokens
- Matches PrivacyPolicy and TermsOfService page styling
- Mobile-responsive with safe-area support

