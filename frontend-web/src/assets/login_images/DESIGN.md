---
name: Appetite Social
colors:
  surface: '#fff8f6'
  surface-dim: '#eed5cd'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1ed'
  surface-container: '#ffe9e3'
  surface-container-high: '#fde3db'
  surface-container-highest: '#f7ddd5'
  on-surface: '#261814'
  on-surface-variant: '#594139'
  inverse-surface: '#3c2d28'
  inverse-on-surface: '#ffede8'
  outline: '#8d7168'
  outline-variant: '#e1bfb5'
  surface-tint: '#ab3500'
  primary: '#ab3500'
  on-primary: '#ffffff'
  primary-container: '#ff6b35'
  on-primary-container: '#5f1900'
  inverse-primary: '#ffb59d'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e3e2e2'
  on-secondary-container: '#646464'
  tertiary: '#00677e'
  on-tertiary: '#ffffff'
  tertiary-container: '#00a7cb'
  on-tertiary-container: '#003744'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd0'
  primary-fixed-dim: '#ffb59d'
  on-primary-fixed: '#390c00'
  on-primary-fixed-variant: '#832600'
  secondary-fixed: '#e3e2e2'
  secondary-fixed-dim: '#c7c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#464747'
  tertiary-fixed: '#b5ebff'
  tertiary-fixed-dim: '#59d5fb'
  on-tertiary-fixed: '#001f28'
  on-tertiary-fixed-variant: '#004e60'
  background: '#fff8f6'
  on-background: '#261814'
  surface-variant: '#f7ddd5'
typography:
  h1:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  h2:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  h3:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 16px
  gutter: 16px
  stack-sm: 4px
  stack-md: 12px
  stack-lg: 24px
---

## Brand & Style
The design system is centered on the concept of "Culinary Discovery." It prioritizes high-quality food photography by utilizing a clean, minimalist aesthetic that allows vibrant imagery to remain the focal point. The brand personality is energetic and social, achieved through the use of a warm, appetizing primary palette balanced by an organized, professional layout. 

The visual style is a blend of **Modern Minimalism** and **Pinterest-inspired Masonry**, emphasizing whitespace and clear hierarchy. It avoids unnecessary decorative elements, opting instead for functional beauty and intuitive navigation. The emotional response is intended to be one of inspiration and clarity, making the act of finding and sharing recipes feel effortless and delightful.

## Colors
The color palette of this design system is driven by a singular, high-energy primary orange (#FF6B35), which evokes hunger and excitement. This is balanced by a foundation of pure white backgrounds to maintain a "clean" and "airy" feel. 

Secondary colors are strictly functional, utilizing a scale of soft greys to define borders and typographic hierarchy without competing with the food photography. The primary orange is reserved for "Action" states, such as buttons, active navigation icons, and key interactive elements, ensuring a clear path for the user’s eye.

## Typography
This design system utilizes a dual-font strategy to balance personality with readability. **Plus Jakarta Sans** is used for headlines; its slightly rounded, modern geometric terminals feel friendly and energetic. For body text and metadata, **Inter** provides a highly legible, neutral foundation that ensures instructions and ingredient lists are easy to scan.

Weight is used as the primary tool for hierarchy. Bold headers provide strong anchors for the page, while the body text remains light and professional.

## Layout & Spacing
The layout follows a fluid grid system optimized for mobile viewing. A standard 16px side margin is maintained across all screens to provide breathing room. 

The layout rhythm is based on an 8px square grid, ensuring consistent vertical stacks. Content is organized in a "vertical flow" philosophy, using varying card heights (Pinterest-style) to create a dynamic browsing experience. Components should use generous padding (minimum 12px) to prevent the UI from feeling cramped, supporting the "organized" brand personality.

## Elevation & Depth
Depth in this design system is achieved through **Ambient Shadows** and tonal layering rather than heavy lines. 

- **Level 0 (Base):** Pure white background (#FFFFFF).
- **Level 1 (Cards/Chips):** Subtle, diffused shadows with a large blur radius (12px to 20px) and low opacity (5-8% black) to make cards appear to "float" slightly above the surface.
- **Level 2 (Navigation/Overlays):** A subtle background blur (backdrop-filter) is used for the bottom navigation bar to maintain a sense of context behind the UI, paired with a very fine top border (#EEEEEE).

Avoid using inner shadows or heavy "drop shadows" that create a dated look.

## Shapes
The shape language is consistently "Rounded" to evoke a friendly and approachable feel. All primary containers, including large food cards and input fields, utilize a 16px (1rem) corner radius. 

Smaller elements like buttons and chips should feel more tactile and are encouraged to use fully rounded "pill" shapes (rounded-full) to distinguish them from content containers. This distinction helps users quickly identify interactive elements versus informational cards.

## Components

### Cards
Cards are the primary vehicle for content. They must feature a full-bleed image at the top, a 16px corner radius, and metadata (title, author, time) positioned directly below the image with clean, left-aligned typography.

### Buttons & Chips
- **Primary Action:** Solid warm orange (#FF6B35) with white text, pill-shaped.
- **Filter Chips:** Horizontal scrolling behavior. Inactive state: Light grey background (#F4F4F4) with dark grey text. Active state: Warm orange background with white text.

### Inputs
Forms should be "clean," using a soft grey border (#EEEEEE) that turns into the primary orange on focus. Labels should be small and bolded (Label-bold) above the field.

### Bottom Navigation
The navigation bar is persistent, using a white background with a subtle blur effect. Icons use a 2pt stroke weight. The active state is indicated by the primary orange color and a subtle 4px dot below the icon.

### Social Elements
Avatars are always circular. "Like" and "Save" buttons on cards are positioned as floating overlays in the top right corner of the image, using a semi-transparent white circle background.