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

## License

Copyright © 2024 RugBoost. All rights reserved.
