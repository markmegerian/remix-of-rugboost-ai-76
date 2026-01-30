
# Fix: Photos Not Displaying Due to Expired Signed URLs

## ✅ COMPLETED

## Summary
Rug photos and other storage assets were failing to load because the app stored time-limited signed URLs (7-day expiry) in the database instead of file paths. After 7 days, these URLs expired and photos stopped displaying.

## Root Cause
The `usePhotoUpload.ts` hook generated signed URLs immediately after upload and stored those URLs in the database. When the URLs expired after 7 days, the images broke.

## Solution Implemented
Store file paths instead of signed URLs, then generate fresh signed URLs on-demand when displaying images. This pattern was already used for business logos and is now applied consistently across the system.

---

## Changes Made

### Phase 1: Core Photo Upload Fix

#### 1. ✅ Updated Photo Upload Hook
**File:** `src/hooks/usePhotoUpload.ts`
- Modified `uploadSinglePhoto` to return the **storage file path** instead of a signed URL
- Removed signed URL generation during upload
- Path format: `{userId}/{timestamp}-{random}-{filename}`

#### 2. ✅ Created Photo URL Component  
**New File:** `src/components/RugPhoto.tsx`
- Reusable component that takes a file path and generates a signed URL on-demand
- Uses the existing `useSignedUrl` hook with automatic refresh
- Handles loading states and error fallbacks gracefully
- Backward compatible: extracts file paths from legacy signed URLs

#### 3. ✅ Updated AnalysisReport Photo Display
**File:** `src/components/AnalysisReport.tsx`
- Replaced direct `<img src={url}>` with the new `<RugPhoto>` component

#### 4. ✅ Updated ClientPortal Photo Display  
**File:** `src/pages/ClientPortal.tsx`
- Replaced direct `<img src={url}>` with the new `<RugPhoto>` component

#### 5. ✅ Database Migration for Existing Data
- Converted signed URLs (with `?token=`) to file paths
- Converted public URLs (`/object/public/rug-photos/`) to file paths

---

### Phase 2: System-Wide Audit & Fixes

#### 6. ✅ Updated History Page
**File:** `src/pages/History.tsx`
- Added import for RugPhoto component
- Replaced direct `<img>` tags for rug thumbnails with `<RugPhoto>`

#### 7. ✅ Updated Client History Page
**File:** `src/pages/ClientHistory.tsx`
- Added import for RugPhoto component
- Replaced direct `<img>` tags for rug thumbnails with `<RugPhoto>`

#### 8. ✅ Updated Business Branding Interface
**Files:** `src/hooks/useJobDetail.ts`, `src/lib/pdfGenerator.ts`
- Changed `logo_url` to `logo_path` in BusinessBranding interface
- Updated query to fetch `logo_path` instead of `logo_url`
- PDF generator now uses `logo_path` (logo is not currently rendered in PDFs)

---

## Files Modified
1. `src/hooks/usePhotoUpload.ts` - Returns paths instead of signed URLs
2. `src/components/RugPhoto.tsx` - New component for on-demand URL generation
3. `src/components/AnalysisReport.tsx` - Uses RugPhoto
4. `src/pages/ClientPortal.tsx` - Uses RugPhoto
5. `src/pages/History.tsx` - Uses RugPhoto for thumbnails
6. `src/pages/ClientHistory.tsx` - Uses RugPhoto for thumbnails
7. `src/hooks/useJobDetail.ts` - Updated branding interface to use logo_path
8. `src/lib/pdfGenerator.ts` - Updated BusinessBranding interface

## Benefits Achieved
1. Photos will never expire - URLs are generated fresh on each view
2. Consistent pattern across all storage assets (rug photos, logos)
3. Reduces database storage (paths are shorter than full URLs)
4. Improves security - tokens aren't stored long-term
5. Backward compatible with any remaining legacy URLs
