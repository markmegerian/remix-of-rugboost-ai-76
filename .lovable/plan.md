

# RugBoost SaaS B2B Landing Page

## Overview

Create a professional, standalone landing page for RugBoost that showcases the AI-powered rug inspection and business management platform. The page will be designed to work independently from the main application, ready to be deployed on a separate VPS.

## Design Philosophy

Following the existing clinical, professional aesthetic:
- Neutral, calm color palette with clear hierarchy
- DM Sans body font, DM Serif Display for headlines
- Primary blue (#2174C6) and accent purple (#6E54D1) gradient accents
- Minimal animations, decisive interactions
- Trust-building, authority-establishing design

## Page Sections

### 1. Hero Section
- Large headline emphasizing AI-powered rug inspection
- Subheadline focusing on business efficiency
- CTA buttons: "Start Free Trial" and "Book Demo"
- Hero device mockup showing the Dashboard (reusing MockDashboard)

### 2. Problem/Solution Section
- Address pain points: manual inspections, slow estimates, client communication
- Position RugBoost as the modern solution

### 3. Feature Showcase (6 Features)
Each feature displayed in alternating layout with device mockups:

| Feature | Mock Component | Headline |
|---------|---------------|----------|
| Job Management | MockDashboard | Manage Jobs Effortlessly |
| AI Analysis | MockAnalysisReport | AI-Powered Inspections |
| Photo Capture | MockPhotoCapture | Guided Photo Capture |
| Estimates | MockEstimate | Professional Estimates |
| Client Portal | MockClientPortal | Seamless Client Experience |
| Analytics | MockAnalytics | Business Insights |

### 4. How It Works
Three-step process:
1. Photograph - Guided capture process
2. Analyze - AI identifies condition and issues
3. Deliver - Professional reports and estimates

### 5. Pricing Section
Three tiers based on existing plan features:

| Plan | Staff | Key Features |
|------|-------|--------------|
| Starter | 2 users | Core features, batch operations, CSV export |
| Pro | 10 users | + Analytics, custom emails, advanced pricing |
| Enterprise | Unlimited | + White-label, API access, priority support |

### 6. Testimonials Section
Placeholder testimonials from rug cleaning businesses

### 7. FAQ Section
Common questions about the platform

### 8. Footer with CTA
Final call-to-action and navigation links

## Files to Create

```text
src/pages/LandingPage.tsx          - Main landing page component
src/components/landing/
├── LandingHero.tsx                - Hero section with device mockup
├── LandingProblemSolution.tsx     - Problem/solution narrative
├── LandingFeatures.tsx            - Feature showcase with mockups
├── LandingHowItWorks.tsx          - Three-step process
├── LandingPricing.tsx             - Pricing tiers
├── LandingTestimonials.tsx        - Social proof section
├── LandingFAQ.tsx                 - Frequently asked questions
├── LandingFooter.tsx              - Footer with CTA and links
└── LandingNavbar.tsx              - Top navigation bar
```

## Technical Implementation

### Reusing Existing Components
- **DeviceFrame** - iPhone frame for feature mockups
- **MockDashboard, MockAnalysisReport, MockEstimate, MockPhotoCapture, MockClientPortal, MockAnalytics** - App screenshots
- **Button** - Existing button component
- **Card** - Existing card component
- **Accordion** - For FAQ section

### Responsive Design
- Mobile-first approach
- Stacked layout on mobile, side-by-side on desktop
- Device mockups scale appropriately per viewport

### Routing
Add route `/landing` to display the landing page:
```typescript
// src/App.tsx
<Route path="/landing" element={<LandingPage />} />
```

## Standalone Export Strategy

When ready to deploy to VPS, the landing page can be extracted as:

1. **Single HTML file** with inlined CSS/JS
2. **Static build** using `npm run build`
3. Required assets:
   - `rugboost-logo.svg`
   - Google Fonts (DM Sans, DM Serif Display)
   - All mockup components (embedded)

The landing page will be self-contained without authentication or backend dependencies.

## Visual Layout Preview

```text
+--------------------------------------------------+
|  NAVBAR: Logo | Features | Pricing | Login | CTA |
+--------------------------------------------------+
|                                                  |
|  HERO                                            |
|  [Headline]              [Device Mockup]         |
|  [Subheadline]           (Dashboard)             |
|  [CTA Buttons]                                   |
|                                                  |
+--------------------------------------------------+
|  PROBLEM/SOLUTION                                |
|  3-column grid of pain points                    |
+--------------------------------------------------+
|                                                  |
|  FEATURES (alternating layout)                   |
|                                                  |
|  [Text]  <-->  [Mockup]                         |
|  [Mockup] <--> [Text]                           |
|  ...repeats for 6 features                      |
|                                                  |
+--------------------------------------------------+
|  HOW IT WORKS                                    |
|  [Step 1] --> [Step 2] --> [Step 3]             |
+--------------------------------------------------+
|  PRICING                                         |
|  [Starter] | [Pro ★] | [Enterprise]              |
+--------------------------------------------------+
|  TESTIMONIALS                                    |
|  3 customer quotes                               |
+--------------------------------------------------+
|  FAQ                                             |
|  Accordion-style questions                       |
+--------------------------------------------------+
|  FOOTER CTA + Links                              |
+--------------------------------------------------+
```

## Summary of Changes

| File | Action |
|------|--------|
| `src/pages/LandingPage.tsx` | Create |
| `src/components/landing/LandingHero.tsx` | Create |
| `src/components/landing/LandingProblemSolution.tsx` | Create |
| `src/components/landing/LandingFeatures.tsx` | Create |
| `src/components/landing/LandingHowItWorks.tsx` | Create |
| `src/components/landing/LandingPricing.tsx` | Create |
| `src/components/landing/LandingTestimonials.tsx` | Create |
| `src/components/landing/LandingFAQ.tsx` | Create |
| `src/components/landing/LandingFooter.tsx` | Create |
| `src/components/landing/LandingNavbar.tsx` | Create |
| `src/App.tsx` | Modify - add `/landing` route |

Total: 10 new files, 1 modified file

