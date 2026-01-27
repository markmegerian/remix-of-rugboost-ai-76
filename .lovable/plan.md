

# Fix App Store Screenshot Export - Remove Alpha Channel

## Problem
App Store Connect is rejecting uploaded screenshots because they contain alpha channels (transparency). The current `html2canvas` export configuration uses `backgroundColor: null`, which preserves any transparent areas in the exported PNG.

## Solution
Update the screenshot export function to produce fully opaque images that App Store Connect will accept.

---

## Implementation Steps

### 1. Update the html2canvas Export Configuration

**File:** `src/pages/ScreenshotGenerator.tsx`

Change the `exportScreenshot` function to:
- Set an explicit solid background color instead of `null`
- Use a white background (`#FFFFFF`) as the base, which will be covered by the gradient backgrounds anyway
- This ensures the exported PNG has no alpha channel

**Current code (line 86-92):**
```typescript
const canvas = await html2canvas(slideRef, {
  scale: 3,
  useCORS: true,
  backgroundColor: null,  // <-- This causes transparency
  width: specs.width / 3,
  height: specs.height / 3,
});
```

**Updated code:**
```typescript
const canvas = await html2canvas(slideRef, {
  scale: 3,
  useCORS: true,
  backgroundColor: '#FFFFFF',  // Solid white base - no alpha
  width: specs.width / 3,
  height: specs.height / 3,
});
```

### 2. Alternative: Export as JPEG Instead of PNG

If you prefer, we can also switch to JPEG format which inherently does not support transparency:

```typescript
link.download = `rugboost-screenshot-${screenshots[index].id}-${device}.jpg`;
link.href = canvas.toDataURL('image/jpeg', 0.95);  // 95% quality JPEG
```

However, **PNG with a solid background is recommended** for App Store screenshots because it provides lossless quality for UI elements and text.

---

## Technical Details

| Setting | Before | After |
|---------|--------|-------|
| Background | `null` (transparent) | `#FFFFFF` (opaque white) |
| Format | PNG with alpha | PNG without alpha |
| Quality | High resolution (3x scale) | Same |

---

## Summary
This is a one-line fix that changes `backgroundColor: null` to `backgroundColor: '#FFFFFF'` in the html2canvas configuration. The white background will be completely covered by your gradient backgrounds, so there will be no visible change to the screenshots - they'll just be App Store compliant.

