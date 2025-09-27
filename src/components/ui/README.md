# Modern UI Components

This directory contains modern, animated UI components designed to create a polished and interactive user experience.

## Components

### TiltedCard
A 3D tilt effect card that responds to mouse movement with smooth animations.
- **Features**: 3D perspective, mouse tracking, smooth transitions
- **Use case**: Product cards, feature highlights, interactive showcases

```tsx
<TiltedCard>
  <div>Your content here</div>
</TiltedCard>
```

### AnimatedList
Renders a list of items with staggered reveal animations.
- **Features**: Staggered animations, customizable delay, smooth entrance
- **Use case**: Business listings, product grids, feature lists

```tsx
<AnimatedList
  items={[
    { id: '1', content: <div>Item 1</div> },
    { id: '2', content: <div>Item 2</div> }
  ]}
  className="grid grid-cols-3 gap-6"
/>
```

### MagicBento
Interactive bento grid with expandable tiles and hover effects.
- **Features**: Expandable tiles, gradient backgrounds, interactive animations
- **Use case**: Dashboard statistics, feature showcases, metrics display

```tsx
<MagicBento
  tiles={[
    {
      id: '1',
      title: 'Total Sales',
      value: '$10,000',
      icon: TrendingUp,
      gradient: 'from-blue-500 to-blue-600',
      description: 'Monthly revenue'
    }
  ]}
/>
```

### GlassCard
Glassmorphism style card with blur effects and modern aesthetics.
- **Features**: Backdrop blur, gradient borders, glass morphism effect
- **Use case**: Modern overlays, feature cards, content containers

```tsx
<GlassCard className="p-6">
  <h3>Modern Card</h3>
  <p>Beautiful glassmorphism effect</p>
</GlassCard>
```

## Design System

### Colors
- **Primary**: Purple/Blue gradient theme
- **Accents**: Emerald, Amber, Cyan, Pink
- **Text**: Slate scale for readability
- **Backgrounds**: Subtle gradients with glass effects

### Animations
- **Entrance**: Fade in with upward motion
- **Hover**: Scale and glow effects
- **Interactive**: Smooth state transitions
- **Loading**: Elegant spinners and pulses

### Responsiveness
All components are built mobile-first with responsive breakpoints:
- `sm:` 640px+
- `md:` 768px+
- `lg:` 1024px+
- `xl:` 1280px+

## Installation

Components use the following dependencies:
- `framer-motion` - For animations
- `lucide-react` - For icons
- `tailwindcss` - For styling
- `clsx` & `tailwind-merge` - For utility classes

## Usage Examples

### Modern Dashboard
```tsx
import { TiltedCard, AnimatedList, MagicBento, GlassCard } from '../ui';

function ModernDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <MagicBento tiles={statsConfig} />
      
      <AnimatedList
        items={businesses.map(business => ({
          id: business.id,
          content: (
            <TiltedCard>
              <GlassCard>
                {/* Business content */}
              </GlassCard>
            </TiltedCard>
          )
        }))}
      />
    </div>
  );
}
```

## Best Practices

1. **Performance**: Use `motion.div` sparingly and prefer CSS transitions for simple animations
2. **Accessibility**: Ensure animations respect `prefers-reduced-motion`
3. **Mobile**: Test touch interactions and ensure components work on mobile
4. **Loading**: Show appropriate loading states during data fetching
5. **Error Handling**: Provide fallbacks for animation failures

## Future Enhancements

- [ ] Dark mode support
- [ ] Additional animation variants
- [ ] Performance optimizations
- [ ] More glassmorphism components
- [ ] Interactive data visualization components