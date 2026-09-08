---
name: Institutional Ledger
colors:
  surface: '#f8f9f9'
  surface-dim: '#d9dada'
  surface-bright: '#f8f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f4'
  surface-container: '#edeeee'
  surface-container-high: '#e7e8e8'
  surface-container-highest: '#e1e3e3'
  on-surface: '#191c1c'
  on-surface-variant: '#3d4a43'
  inverse-surface: '#2e3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4b'
  primary: '#006949'
  on-primary: '#ffffff'
  primary-container: '#00855e'
  on-primary-container: '#f5fff7'
  inverse-primary: '#69dbab'
  secondary: '#595e69'
  on-secondary: '#ffffff'
  secondary-container: '#dbdfec'
  on-secondary-container: '#5e636e'
  tertiary: '#9a3e39'
  on-tertiary: '#ffffff'
  tertiary-container: '#b95650'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#86f8c5'
  primary-fixed-dim: '#69dbab'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005138'
  secondary-fixed: '#dee2ef'
  secondary-fixed-dim: '#c2c6d3'
  on-secondary-fixed: '#171c25'
  on-secondary-fixed-variant: '#424751'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410003'
  on-tertiary-fixed-variant: '#7e2a26'
  background: '#f8f9f9'
  on-background: '#191c1c'
  surface-variant: '#e1e3e3'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  financial-data:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-caps:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  gutter-table: 12px
  margin-section: 32px
  density-compact: 8px
  density-comfortable: 16px
---

## Brand & Style
The design system is engineered for high-stakes institutional financial management. The brand personality is authoritative, precise, and transparent, reflecting the fiscal responsibility of a university environment. 

The visual style follows **Corporate Modernism** with a focus on high-density information display. It prioritizes clarity and functional efficiency over decorative elements. The aesthetic utilizes a "Clean Enterprise" approach: expansive whitespace used strategically to separate complex data sets, razor-sharp alignment, and a sophisticated OKLCH-based color implementation that ensures uniform perceptual lightness across financial status indicators.

## Colors
The palette is rooted in a professional Islamic-finance green, balanced by institutional neutrals. 

- **Primary:** Used for core actions, active navigation states, and primary brand touchpoints.
- **Surface:** A cool-toned neutral grey-white provides a sterile, glare-free environment for prolonged data entry.
- **Semantic/Status:** These use a consistent chroma and lightness logic in OKLCH to ensure that "Lunas" (Green), "Belum Bayar" (Red), and "Sebagian" (Gold) carry equal visual weight in high-density tables without one color overpowering the others.

## Typography
The system employs a dual-font strategy. **Geist** is used for headlines, labels, and financial figures due to its technical precision and superior legibility in tabular formats. **Inter** handles body text for high readability in reports and documentation.

For financial figures, always use the `financial-data` role to ensure monospaced-like alignment of numerals, which prevents layout shifting when values update. High-contrast weights (SemiBold/Bold) should be reserved for total balances and critical status labels.

## Layout & Spacing
The layout follows a **Fluid-Fixed Hybrid** model. Navigation sidebars are fixed-width (280px) to maintain consistent access, while the main content area utilizes a fluid grid to maximize the visibility of wide financial tables.

- **Grid:** A 12-column grid is used for dashboard layouts. In high-density views (Ledgers/Transactions), a customized data-grid with 12px gutters is used to pack more information per viewport.
- **Responsiveness:** On mobile, sidebars transition into bottom-anchored sheets (Drawers) to maintain PWA-readiness. Margins compress from 24px (desktop) to 16px (mobile) to prioritize content.

## Elevation & Depth
This design system uses **Tonal Layering** and **Low-Contrast Outlines** rather than heavy shadows to maintain a clean, institutional feel.

1. **Base:** Surface (oklch(98% 0.01 200)) for the application background.
2. **Cards:** Pure white background with a 1px border of oklch(90% 0.01 200). No shadow.
3. **Floating Elements (Modals/Drawers):** A subtle, extra-diffused shadow (oklch(0% 0 0 / 5%) with 20px blur) is used only when an element is physically layered over another to provide necessary contrast.
4. **Active States:** Subtle inset shadows are used for pressed buttons to provide tactile feedback without breaking the flat aesthetic.

## Shapes
The shape language is **Soft (0.25rem)**. This slight rounding takes the edge off the high-density grid without sacrificing the professional, "square" look expected of financial software. 

- **Input Fields/Buttons:** 4px (0.25rem) radius.
- **Large Cards/Containers:** 8px (0.5rem) radius.
- **Status Badges:** Fully rounded (pill) to distinguish them from interactive buttons.

## Components
Consistent with Shadcn UI principles, components are built for modularity and high data density.

- **Tables:** The core of the system. Rows must have a hover state (oklch(96% 0.01 200)). Use `tabular-nums` for all amount columns.
- **Buttons:** Primary buttons use the Islamic-finance green. Ghost buttons are preferred for secondary actions in tables to reduce visual noise.
- **Badges:** Use the defined OKLCH status colors. Text color within badges should be a darkened version of the background color for maximum contrast (approx. -40% lightness).
- **Inputs:** Use 1px borders. Focused inputs use a 2px primary green ring with 0px offset.
- **Cards:** Used to group dashboard metrics. Header sections within cards should use a subtle bottom border rather than a change in background color.
- **Drawers:** On mobile, all complex filters and entry forms must appear in a bottom-anchored drawer for ease of thumb-reach.