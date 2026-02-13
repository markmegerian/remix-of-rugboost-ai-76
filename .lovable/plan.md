# Animated AI Analysis Loader

## Problem

The current loader shows only 3 static messages with fixed progress bar jumps. During the longest phase ("analyzing," ~20-40 seconds), the UI is completely frozen on one message, making it feel broken or stuck.

## Solution

Replace the static stage-based progress with a time-aware, auto-advancing loader that cycles through engaging messages during the analysis phase, with a smoothly animated progress bar.

## How It Will Work

The loader will feel alive throughout the entire ~30-second wait:

**Phase 1: Preparing (0-2s)**

- "Uploading photos..."
- Progress bar: 0% to 15% (smooth)

**Phase 2: Analyzing (2-30s) -- the long phase**

- The progress bar smoothly advances from 15% to 80% over ~28 seconds
- Messages rotate every ~4 seconds with a fade transition:
  1. "Examining rug construction ..."
  2. "Identifying fiber content and weave ..."
  3. "Inspecting fringe and edge condition..."
  4. "Inspecting bindings..."
  5. "Checking for stains and discoloration..."
  6. "Assessing structural damage and wear..."
  7. "Mapping areas that need attention..."
  8. "Calculating restoration costs..."
- Each message gets a matching icon (Search, Layers, Droplets, Scissors, Shield, MapPin, Calculator)

**Phase 3: Generating (30-35s)**

- "Building your detailed report..."
- Progress: 80% to 95%

**Phase 4: Complete**

- "Analysis complete!" with checkmark
- Progress snaps to 100%

## Visual Enhancements

- Fade-in/fade-out transition on message text changes (using CSS opacity transition)
- The RugBoost logo replaces the generic Loader2 spinner, with a gentle pulse animation (consistent with the branded page loader)
- A subtle elapsed time indicator ("~15s") so users know things are moving
- The 4 step dots at the bottom remain for stage orientation

## Technical Approach

**Changes to `src/components/AnalysisProgress.tsx`:**

- Add a `useEffect` with `setInterval` (every ~4 seconds) to cycle through analyzing sub-messages
- Add a `useEffect` for smooth progress bar interpolation using `requestAnimationFrame` or a simple interval that increments progress by ~2% per second during the analyzing phase
- Track `startTime` with `useRef` to calculate elapsed time
- Add CSS transition on the message text (opacity fade)
- Import the RugBoost logo for branding

**No changes needed to:**

- `useJobDetailActions.ts` (stage transitions stay the same)
- The `AnalysisStage` type (same 5 stages)
- The props interface (same props)

This is a purely visual improvement -- the component stays a controlled component driven by the same `stage` prop from the parent.