import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
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
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.3, once: true });

  const getInitialOffset = () => {
    switch (direction) {
      case 'up': return { y: 50, x: 0 };
      case 'down': return { y: -50, x: 0 };
      case 'left': return { y: 0, x: 50 };
      case 'right': return { y: 0, x: -50 };
      default: return { y: 50, x: 0 };
    }
  };

  const initial = getInitialOffset();

  return (
    <motion.div
      ref={ref}
      initial={{
        ...initial,
        opacity: 0,
        scale: 0.8,
      }}
      animate={inView ? {
        y: 0,
        x: 0,
        opacity: 1,
        scale: 1,
      } : {}}
      transition={{
        duration: 0.6,
        delay: delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={className}
    >
      {children}
    </motion.div>
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