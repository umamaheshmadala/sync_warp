import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BentoItem {
  id: string;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
  className?: string;
  span?: {
    cols?: number;
    rows?: number;
  };
  gradient?: string;
  icon?: React.ReactNode;
}

interface MagicBentoProps {
  items: BentoItem[];
  className?: string;
  columns?: number;
  gap?: number;
}

export default function MagicBento({
  items,
  className,
  columns = 3,
  gap = 4
}: MagicBentoProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getGridCols = () => {
    switch (columns) {
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-4';
      default: return 'grid-cols-3';
    }
  };

  const getGap = () => {
    switch (gap) {
      case 2: return 'gap-2';
      case 3: return 'gap-3';
      case 4: return 'gap-4';
      case 6: return 'gap-6';
      case 8: return 'gap-8';
      default: return 'gap-4';
    }
  };

  const getColSpan = (span?: number) => {
    if (!span || span === 1) return '';
    switch (span) {
      case 2: return 'col-span-2';
      case 3: return 'col-span-3';
      case 4: return 'col-span-4';
      default: return '';
    }
  };

  const getRowSpan = (span?: number) => {
    if (!span || span === 1) return '';
    switch (span) {
      case 2: return 'row-span-2';
      case 3: return 'row-span-3';
      case 4: return 'row-span-4';
      default: return '';
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        `grid ${getGridCols()} ${getGap()} auto-rows-fr`,
        className
      )}
    >
      {items.map((item) => (
        <motion.div
          key={item.id}
          className={cn(
            'relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm',
            'hover:shadow-lg transition-all duration-300',
            item.gradient || 'bg-gradient-to-br from-gray-50 to-gray-100',
            getColSpan(item.span?.cols),
            getRowSpan(item.span?.rows),
            item.className
          )}
          onMouseEnter={() => setHoveredId(item.id)}
          onMouseLeave={() => setHoveredId(null)}
          whileHover={{ 
            scale: 1.02,
            transition: { duration: 0.2 }
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Background glow effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-500/10"
            animate={{
              opacity: hoveredId === item.id ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
          />

          {/* Content */}
          <div className="relative p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {item.title}
                </h3>
                {item.subtitle && (
                  <p className="text-sm text-gray-600">{item.subtitle}</p>
                )}
              </div>
              {item.icon && (
                <div className="ml-4 p-2 bg-white/50 rounded-lg">
                  {item.icon}
                </div>
              )}
            </div>

            {/* Main content */}
            <div className="flex-1 flex items-center justify-center">
              {item.content}
            </div>

            {/* Hover particles effect */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{
                opacity: hoveredId === item.id ? 1 : 0,
              }}
              transition={{ duration: 0.3 }}
            >
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-blue-400 rounded-full"
                  animate={{
                    x: [0, 100, 0],
                    y: [0, -50, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                  style={{
                    left: `${20 + i * 30}%`,
                    top: `${80}%`,
                  }}
                />
              ))}
            </motion.div>
          </div>

          {/* Border glow */}
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-blue-400/0"
            animate={{
              borderColor: hoveredId === item.id 
                ? 'rgba(59, 130, 246, 0.3)' 
                : 'rgba(59, 130, 246, 0)',
            }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      ))}
    </div>
  );
}