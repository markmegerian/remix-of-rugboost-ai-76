

# Fix: jspdf FontStyle Build Error

## Problem
`src/lib/pdfGenerator.ts` line 64 defines `italic: 'oblique'` and line 65 defines `boldItalic: 'boldoblique'`, but jspdf's `FontStyle` type only accepts `'normal' | 'bold' | 'italic' | 'bolditalic'`.

## Fix
Update the FONT config object (lines 64-65):

```typescript
// Before
italic: 'oblique' as const,
boldItalic: 'boldoblique' as const,

// After
italic: 'italic' as const,
boldItalic: 'bolditalic' as const,
```

This is a 2-line change in one file. No functional behavior changes — Helvetica renders identically with `italic` vs `oblique` in jspdf since it maps to the same built-in font variant.
