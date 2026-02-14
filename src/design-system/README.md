# Design System Documentation

## Overview

The GoLudo Design System provides a centralized, consistent foundation for all UI components. It includes design tokens, reusable components, and accessibility features.

## Structure

```
src/design-system/
├── tokens.css              # Centralized design tokens
├── components/
│   ├── Button.tsx          # Reusable button component
│   ├── Button.css
│   ├── Card.tsx            # Reusable card component
│   ├── Card.css
└── index.ts                # Main export file
```

## Design Tokens

All design tokens are defined in `tokens.css` and follow semantic naming conventions.

### Colors

```css
/* Semantic Colors */
--color-primary: #ff007a      /* Pink accent */
--color-secondary: #8b5cf6    /* Purple accent */
--color-tertiary: #22d3ee     /* Cyan accent */
--color-success: #00ff88      /* Green */
--color-warning: #ffd700      /* Gold */
--color-error: #ff4757        /* Red */
--color-info: #00a2ff         /* Blue */
```

### Typography

```css
/* Font Families */
--font-display: 'Orbitron'
--font-body: 'Exo 2', 'Inter'

/* Font Sizes (1.25 ratio) */
--text-xs: 0.75rem    /* 12px */
--text-sm: 0.875rem   /* 14px */
--text-base: 1rem     /* 16px */
--text-lg: 1.125rem   /* 18px */
--text-xl: 1.25rem    /* 20px */
--text-2xl: 1.5rem    /* 24px */
--text-3xl: 1.875rem  /* 30px */
--text-4xl: 2.25rem   /* 36px */
--text-5xl: 3rem      /* 48px */
```

### Spacing (4px base)

```css
--space-1: 0.25rem   /* 4px */
--space-2: 0.5rem    /* 8px */
--space-3: 0.75rem   /* 12px */
--space-4: 1rem      /* 16px */
--space-6: 1.5rem    /* 24px */
--space-8: 2rem      /* 32px */
--space-12: 3rem     /* 48px */
--space-16: 4rem     /* 64px */
```

### Shadows

```css
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.3)
--shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.4)
--shadow-md: 0 8px 32px rgba(0, 0, 0, 0.5)
--shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.6)
--shadow-xl: 0 24px 64px rgba(0, 0, 0, 0.7)
```

## Components

### Button

Reusable button component with multiple variants and full accessibility support.

**Usage:**

```tsx
import { Button } from '@/design-system';

// Primary button
<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>

// Secondary button with icon
<Button 
  variant="secondary" 
  size="lg" 
  icon={<span>🎲</span>}
>
  Roll Dice
</Button>

// Loading state
<Button variant="primary" loading>
  Processing...
</Button>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | Visual style |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `fullWidth` | `boolean` | `false` | Full width button |
| `loading` | `boolean` | `false` | Show loading spinner |
| `icon` | `ReactNode` | - | Icon before text |
| `iconAfter` | `ReactNode` | - | Icon after text |
| `ariaLabel` | `string` | - | Accessible label |

**Accessibility:**
- ✅ Keyboard navigation (Enter/Space)
- ✅ Focus visible outline
- ✅ ARIA labels
- ✅ Disabled state
- ✅ Loading state with `aria-busy`

---

### Card

Reusable card component with glassmorphism effects.

**Usage:**

```tsx
import { Card } from '@/design-system';

// Glass card
<Card variant="glass" padding="md">
  <h3>Card Title</h3>
  <p>Card content</p>
</Card>

// Clickable card
<Card 
  variant="elevated" 
  hoverable 
  clickable 
  onClick={handleClick}
>
  Click me!
</Card>

// Card with header and footer
<Card
  variant="solid"
  header={<h3>Header</h3>}
  footer={<button>Action</button>}
>
  Content
</Card>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'glass' \| 'solid' \| 'elevated'` | `'glass'` | Visual style |
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` | Internal padding |
| `clickable` | `boolean` | `false` | Make card clickable |
| `hoverable` | `boolean` | `false` | Add hover effect |
| `header` | `ReactNode` | - | Header content |
| `footer` | `ReactNode` | - | Footer content |
| `ariaLabel` | `string` | - | Accessible label |

**Accessibility:**
- ✅ Keyboard navigation (if clickable)
- ✅ Focus visible outline
- ✅ ARIA labels
- ✅ Semantic HTML

---

## Utility Classes

### Text Colors

```css
.text-primary    /* rgba(255, 255, 255, 0.95) */
.text-secondary  /* rgba(255, 255, 255, 0.7) */
.text-tertiary   /* rgba(255, 255, 255, 0.5) */
.text-disabled   /* rgba(255, 255, 255, 0.3) */
```

### Backgrounds

```css
.bg-primary      /* #0a0a1a */
.bg-secondary    /* #0d0d21 */
.bg-surface      /* #101025 */
```

### Effects

```css
.gradient-text   /* Gradient text effect */
.glow-pink       /* Pink glow shadow */
.glow-purple     /* Purple glow shadow */
.glow-cyan       /* Cyan glow shadow */
.glow-gold       /* Gold glow shadow */
```

### Interactive

```css
.clickable       /* Cursor pointer + hover lift */
.no-select       /* Disable text selection */
```

---

## Accessibility Features

All components follow WCAG 2.1 AA standards:

- ✅ **Keyboard Navigation** - All interactive elements accessible via keyboard
- ✅ **Focus Management** - Clear focus indicators
- ✅ **ARIA Labels** - Screen reader support
- ✅ **Color Contrast** - Minimum 4.5:1 ratio for text
- ✅ **Touch Targets** - Minimum 44x44px on mobile
- ✅ **Reduced Motion** - Respects `prefers-reduced-motion`

---

## Responsive Design

All components are mobile-first and responsive:

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px - 1440px
- **Large Desktop**: > 1440px

---

## Usage in Existing Components

To use the design system in existing components:

```tsx
// Old way
<button className="btn-primary">Click</button>

// New way
import { Button } from '@/design-system';
<Button variant="primary">Click</Button>
```

This provides:
- Consistent styling
- Built-in accessibility
- Type safety
- Easier maintenance

---

## Future Components

Planned components for Phase 2:

- [ ] Modal
- [ ] Toast/Notification
- [ ] Input
- [ ] Select
- [ ] Checkbox
- [ ] Radio
- [ ] Switch
- [ ] Tooltip
- [ ] Badge
- [ ] Avatar
- [ ] Spinner

---

## Contributing

When adding new components:

1. Use design tokens from `tokens.css`
2. Follow accessibility guidelines
3. Add TypeScript types
4. Include documentation
5. Test on mobile and desktop
6. Support reduced motion
