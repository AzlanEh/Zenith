# Design Specification: Start at Login in Onboarding Wizard

**Date:** 2026-08-09  
**Status:** Approved  
**Topic:** Onboarding Autostart Option  

---

## 1. Objective
Add a "Start at Login" option to Phase 03 of the Onboarding Wizard in Zenith (`src/components/OnboardingWizard.tsx`) to ensure users are aware of and can easily enable autostart on system boot. This ensures continuous active window telemetry tracking and background screen time enforcement from the moment the user completes onboarding.

---

## 2. User Experience & Design System
- **Location:** Step 2 (Phase 03 // Ignition - "The Sanctuary is Ready") in `src/components/OnboardingWizard.tsx`.
- **Aesthetics:** Aligned with Zenith's brutalist design system (zero border radius `rounded-none`, oklch dark mode colors, `bg-card`, `border border-border`, font hierarchies using `font-headline`, `font-mono`, `font-label`, and `font-body`).
- **Layout:**
  - Placed between the summary parameters grid (Duration, Mode, Acoustics) and the "Enter Sanctuary" call-to-action button.
  - A card containing:
    - **Header & Badge:** "Start at Login" with a high-contrast label/badge `RECOMMENDED`.
    - **Description:** *"Launch Zenith automatically on boot to ensure continuous telemetry and screen time enforcement."*
    - **Interactive Toggle:** Brutalist toggle switch (`ON`/`OFF`), enabled (`true`) by default.

---

## 3. Architecture & Data Flow

```
[OnboardingWizard Mount / Step 2] ──> Fetch api.getAutostartStatus() ──> Set autostartEnabled state
                                                                                  │
[User Action] ──> Toggle Switch ──────────────────────────────────────────────────┤
                                                                                  │
[User Clicks "Enter Sanctuary"] ──> api.initOnboardingGoals(...)                  │
                                ──> enableAutostart() / disableAutostart() <──────┘
                                ──> Set localStorage("onboarding_completed")
                                ──> onComplete()
```

### Components & State
1. **State:**
   - `autostartEnabled` (boolean, default: `true`).
   - `isAutostartLoading` (boolean, default: `false`).
2. **API Interactions (`src/services/api.ts`):**
   - Query `api.getAutostartStatus()` upon loading Step 2.
   - Execute `api.enableAutostart()` or `api.disableAutostart()` in `finish()` before completing onboarding.

---

## 4. Error Handling & Edge Cases
- **Autostart API Failure:** If enabling or disabling autostart fails (e.g. systemd/registry permissions issue), log the error via `logger.error` and show a non-blocking toast warning (`toast.error`), allowing the user to complete onboarding and enter the application smoothly.
- **Tauri IPC Unavailable / Web Browser Mode:** Fall back gracefully if `getAutostartStatus` throws or is unimplemented in web preview mode.

---

## 5. Verification Plan

### Unit & Component Tests (`src/components/OnboardingWizard.test.tsx`)
- Test that `OnboardingWizard` renders the "Start at Login" card on Step 2.
- Test that the toggle defaults to `true`.
- Test that toggling updates state to `false`.
- Test that clicking "Enter Sanctuary" calls `api.enableAutostart()` when enabled, or `api.disableAutostart()` when disabled.

### Manual Verification
- Launch dev server (`npm run dev`) or test build.
- Complete onboarding and verify autostart status in system settings / Settings page.
