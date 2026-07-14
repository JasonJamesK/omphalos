---
status: testing
phase: 04-image-cropping-storage-cropper-js-v2-rollout
source: [04-VERIFICATION.md]
started: 2026-07-14T08:11:31.830Z
updated: 2026-07-14T08:11:31.830Z
---

## Current Test

number: 1
name: Interactive crop-stage behavior (drag, resize handles, grid, touch) at all 3 sites
expected: |
  Open the Character Library, add/edit a character, upload a portrait; repeat for the
  Locations-tab library; repeat for an in-session character (Characters tab or NPC Quick
  Bar) and an in-session location (AddLocationModal). At each site, drag the crop
  selection, resize via each corner/edge handle, and confirm the rule-of-thirds grid
  renders in the app's amber accent (not Cropper's default blue). Selection drags/resizes
  smoothly; grid and handles render amber; behavior matches the retired CropModal.jsx's
  drag/resize UX.
awaiting: user response

## Tests

### 1. Interactive crop-stage behavior (drag, resize handles, grid, touch) at all 3 sites
expected: Selection drags/resizes smoothly; grid and handles render amber (#d4a574, not Cropper's default blue); behavior matches the retired CropModal.jsx's drag/resize UX at all 3 sites (Character Library, in-session Character, in-session Location).
result: [pending]

### 2. Zoom (wheel + pinch) and EXIF-photo orientation
expected: Smooth zoom via mouse wheel and pinch (if a touch device is available); a real phone photo with EXIF rotation data displays right-side-up in the crop stage; no blank canvas on iOS Safari (if available).
result: [pending]

### 3. GIF upload/display/re-crop round trip
expected: Uploading a small animated GIF at each of the 3 crop sites skips the crop modal (inline notice shown instead) and the GIF animates in every card/preview that renders it. Clicking "Re-crop" on that same GIF-holding entry still skips the crop modal (CR-01 fix) rather than baking the GIF down to a static frame.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
