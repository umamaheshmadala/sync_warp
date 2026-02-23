import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  blur?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  opacity?: number;
  gradient?: boolean;
  border?: boolean;
  shadow?: boolean;
}

export default function GlassCard({
  children,
  className,
  blur = 'none',
  opacity = 0.1,
  gradient = true,
  border = true,
  shadow = true
}: GlassCardProps) {
  const getBlurClass = () => {
    switch (blur) {
      case 'none': return '';
      case 'sm': return 'backdrop-blur-sm';
      case 'md': return 'backdrop-blur-md';
      case 'lg': return 'backdrop-blur-lg';
      case 'xl': return 'backdrop-blur-xl';
      default: return '';
    }
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl',
        getBlurClass(),
        gradient && 'bg-gradient-to-br from-white/20 via-white/10 to-transparent',
        border && 'border border-white/20',
        shadow && 'shadow-xl shadow-black/10',
        className
      )}
      style={{
        backgroundColor: `rgba(255, 255, 255, ${opacity})`,
      }}
    >
      {/* Glass reflection effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Bottom highlight */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </div>
  );
}