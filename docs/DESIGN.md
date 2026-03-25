# Zenith Monochrome Design System

### 1. Overview & Creative North Star
**Creative North Star: "The Brutalist Sanctuary"**
Zenith Monochrome is a design system built on the philosophy of reductive elegance. It rejects the "app-like" clutter of modern software in favor of an editorial, high-fashion aesthetic. By combining razor-sharp geometry (0px border-radius) with sophisticated serif accents and a strictly disciplined grayscale palette, Zenith creates a space of profound digital focus. It breaks the traditional grid through massive typographic scales (10rem) and intentional whitespace, treating every screen as a printed gallery page rather than a functional utility.

### 2. Colors
The palette is rooted in `oklch(0.9702 0 0)`, a near-white neutral that provides a soft, non-fatiguing canvas.
- **The "No-Line" Rule:** Visual separation is achieved through tonal shifts (e.g., transitioning from `surface` to `surface_container_low`) rather than borders. When structure is required, use background-color nesting.
- **Surface Hierarchy:** Depth is built using a "Layered Paper" approach. The `background` serves as the table, while `surface_container` represents panels placed upon it. 
- **Signature Textures:** Use high-diffusion blurs (e.g., `blur-3xl`) with primary or secondary accents to create atmospheric "auras" behind active elements, adding life to an otherwise austere monochrome environment.

### 3. Typography
The system employs a dual-font strategy to balance utility with high-end editorial flair.
- **Display & Headline:** Uses **Newsreader** (Serif). This conveys authority, wisdom, and a "slow-living" vibe. 
- **Body & Functional:** Uses **Inter** (Sans). A neutral, high-legibility choice for interface elements.
- **Data & Timer:** Uses **Geist Mono**. For rhythmic, tabular data and time-tracking, providing a "lab-instrument" precision.

**Typographic Rhythm (Extracted Scale):**
- **Hero Display:** `10rem` (Light weight, tabular numerals for timers).
- **Page Title:** `2.25rem` (Serif).
- **Section Heading:** `1.125rem` to `1.25rem` (Serif).
- **Body Text:** `0.875rem` (Sans).
- **Micro-Labels:** `0.75rem` (Uppercase, tracked out +5% to +10%).

### 4. Elevation & Depth
Zenith abandons traditional Material shadows in favor of **Tonal Layering** and **Atmospheric Depth**.
- **The Layering Principle:** Construct depth by nesting darker surfaces inside lighter ones. A `surface_container` box on a `background` page creates focus without needing a shadow.
- **Ambient Shadows:** Only used for "floating" glass panels. The system uses a specialized shadow: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`. It is nearly invisible, providing just enough lift to separate interactive cards from the background.
- **Glassmorphism:** For top navigation and modal elements, use a `backdrop-blur-sm` combined with an 80% opacity background color to maintain a sense of environmental continuity.

### 5. Components
- **Buttons:** Strictly rectangular (0px radius). Primary buttons use `on_surface` (Black) with `surface` (White) text. Hover states should involve a subtle scale-up or shadow-deepening rather than a color change.
- **Inputs:** Understated. Use a subtle background fill (`secondary/30`) and a 2px bottom-border or full border that activates only on focus.
- **Navigation:** Vertical sidebar with high contrast. Active states are marked by a solid `primary` color bar and a subtle background shift.
- **Status Indicators:** Use "Pulsing Auras." Instead of static dots, use a `ping` animation to signify live processes (e.g., Syncing).

### 6. Do's and Don'ts
- **Do:** Use massive contrast in font sizes to create hierarchy.
- **Do:** Embrace "Dead Space." Let elements breathe with large padding (`p-8` or `p-12`).
- **Don't:** Use rounded corners on any structural element (cards, buttons, inputs).
- **Don't:** Introduce saturated colors. If color is needed, use them as low-chroma "accents" or "charts" (e.g., the muted `chart-1` teal).
- **Do:** Use grayscale images or high-contrast photography to match the system's aesthetic.
