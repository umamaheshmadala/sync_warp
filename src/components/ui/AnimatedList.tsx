import { useInView } from 'react-intersection-observer';
import { cn } from '@/lib/utils';

interface AnimatedListProps {
  items: React.ReactNode[];
  className?: string;
  itemClassName?: string;
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

const AnimatedItem = ({
  children,
  delay = 0,
  className,
  direction = 'up'
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
}) => {
  const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true });

  const getInitialOffsetClass = () => {
    switch (direction) {
      case 'up': return 'translate-y-12';
      case 'down': return '-translate-y-12';
      case 'left': return 'translate-x-12';
      case 'right': return '-translate-x-12';
      default: return 'translate-y-12';
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        inView ? "opacity-100 translate-y-0 translate-x-0 scale-100" : `opacity-0 scale-95 ${getInitialOffsetClass()}`,
        className
      )}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
};

export default function AnimatedList({
  items,
  className,
  itemClassName,
  staggerDelay = 0.1,
  direction = 'up'
}: AnimatedListProps) {
  return (
    <div className={cn("w-full", className)}>
      {items.map((item, index) => (
        <AnimatedItem
          key={index}
          delay={index * staggerDelay}
          className={itemClassName}
          direction={direction}
        >
          {item}
        </AnimatedItem>
      ))}
    </div>
  );
}