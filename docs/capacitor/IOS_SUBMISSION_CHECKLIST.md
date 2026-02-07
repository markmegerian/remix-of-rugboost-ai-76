# iOS App Store Submission Checklist

This document provides the required steps and configurations for submitting the RugBoost app to the Apple App Store.

## Prerequisites

Before you begin, ensure you have:
- A Mac with Xcode 15+ installed
- An Apple Developer account ($99/year)
- The project cloned locally with `npm install` completed
- Built the web app with `npm run build`

## 1. Add iOS Platform

If you haven't added iOS to the project yet:

```bash
npx cap add ios
npx cap sync ios
```

## 2. Required Info.plist Usage Descriptions

Open `ios/App/App/Info.plist` and add the following usage descriptions. These are **required** by Apple when your app uses these features:

```xml
<!-- Camera usage - Required for rug photo capture -->
<key>NSCameraUsageDescription</key>
<string>RugBoost needs camera access to take photos of rugs for inspection and analysis.</string>

<!-- Photo Library usage - Required for selecting existing photos -->
<key>NSPhotoLibraryUsageDescription</key>
<string>RugBoost needs photo library access to select rug photos for inspection.</string>

<!-- Photo Library Add usage - Required for saving photos -->
<key>NSPhotoLibraryAddUsageDescription</key>
<string>RugBoost saves inspection photos to your photo library.</string>
```

## 3. Push Notifications Setup

### Enable Push Notifications Capability

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select the "App" target in the project navigator
3. Go to "Signing & Capabilities" tab
4. Click "+ Capability" and add "Push Notifications"
5. Add "Background Modes" capability and check "Remote notifications"

### Configure APNs in Apple Developer Portal

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list)
2. Select your App ID (`com.rugboost.app`)
3. Enable "Push Notifications"
4. Create an APNs Key or Certificate for sending notifications

### Entitlements File

Ensure `ios/App/App/App.entitlements` includes:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>aps-environment</key>
    <string>production</string>
</dict>
</plist>
```

## 4. Deep Linking / Universal Links (Recommended)

For a seamless user experience, set up Universal Links so web URLs open directly in the app.

### Configure Associated Domains Capability

1. In Xcode, add "Associated Domains" capability
2. Add domains:
   - `applinks:rug-scan-report.lovable.app`
   - `applinks:yourdomain.com` (if using custom domain)

### Create apple-app-site-association File

Host this file at `https://yourdomain.com/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.rugboost.app",
        "paths": [
          "/client/*",
          "/auth-callback",
          "/reset-password",
          "/payment/*"
        ]
      }
    ]
  }
}
```

Replace `TEAM_ID` with your Apple Developer Team ID.

### Custom URL Scheme (Already Configured)

The app already supports the `rugboost://` custom scheme for deep links. This is configured in `capacitor.config.ts` and works automatically.

## 5. Supabase Redirect URL Allowlist

In your Supabase project dashboard, add these redirect URLs under **Authentication > URL Configuration**:

### Required Redirect URLs

```
rugboost://auth-callback
rugboost://reset-password
https://rug-scan-report.lovable.app
https://rug-scan-report.lovable.app/auth-callback
https://rug-scan-report.lovable.app/reset-password
```

If using a custom domain, add:
```
https://yourdomain.com
https://yourdomain.com/auth-callback
https://yourdomain.com/reset-password
```

### Site URL

Set the Site URL to your production web URL:
```
https://rug-scan-report.lovable.app
```

## 6. App Store Connect Setup

### Required Screenshots

Prepare screenshots for these device sizes:
- iPhone 6.7" (iPhone 15 Pro Max)
- iPhone 6.5" (iPhone 11 Pro Max)
- iPhone 5.5" (iPhone 8 Plus)
- iPad Pro 12.9" (if supporting iPad)

### App Information

- **Category**: Business or Productivity
- **Age Rating**: 4+ (no objectionable content)
- **Privacy Policy URL**: Required - link to your privacy policy

### Privacy Declarations

Declare data collection practices:
- Photos (optional, for rug inspection)
- Email address (account creation)
- Payment information (processed via Stripe, not stored)

## 7. Build & Submit

### Create Archive

1. In Xcode, select "Any iOS Device" as the build target
2. Go to Product > Archive
3. Wait for the archive to complete

### Upload to App Store Connect

1. Open Window > Organizer
2. Select the archive and click "Distribute App"
3. Choose "App Store Connect" and follow the prompts
4. Wait for processing (usually 15-30 minutes)

### Submit for Review

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app and version
3. Fill in all required metadata
4. Upload screenshots
5. Submit for review

## 8. Production Checklist

Before submitting, verify:

- [ ] All Info.plist usage descriptions are present
- [ ] Push notification capability is enabled
- [ ] Deep links work correctly (`rugboost://auth-callback`)
- [ ] Stripe payment flow completes successfully
- [ ] App icon and launch screen are configured
- [ ] Privacy policy is accessible
- [ ] No `server.url` in capacitor.config.ts (production build)
- [ ] Test on actual device, not just simulator

## Common Rejection Reasons

1. **Missing usage descriptions** - App crashes when accessing camera/photos
2. **Login required without demo** - Provide a demo account in review notes
3. **Broken links** - Test all external links work
4. **Incomplete payment flow** - Test Stripe in live mode

## Support

For additional help with iOS deployment, refer to:
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
