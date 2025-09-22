// src/components/PageTransition.tsx
// Page transition wrapper using Framer Motion for smooth animations

import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

// Animation variants for different page types
const variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1] as const // Custom easing for smooth feel
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1] as const
    }
  }
}

// Special variants for auth pages (slide from right)
const authVariants = {
  initial: {
    opacity: 0,
    x: 50
  },
  enter: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] as const
    }
  },
  exit: {
    opacity: 0,
    x: -50,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1] as const
    }
  }
}

// Modal-like variants for onboarding and settings
const modalVariants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 40
  },
  enter: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] as const
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 40,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1] as const
    }
  }
}

export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()

  // Determine which animation variant to use based on current route
  const getVariants = () => {
    const path = location.pathname
    
    if (path.startsWith('/auth/')) {
      return authVariants
    }
    
    if (path === '/onboarding' || path === '/settings' || path === '/profile') {
      return modalVariants
    }
    
    return variants
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={getVariants()}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Hook for custom page transitions in components
export function usePageTransition() {
  const location = useLocation()
  
  return {
    location,
    animate: (custom: object = {}) => ({
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
      transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
      ...custom
    })
  }
}

// Staggered children animation for lists and grids
export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

export const staggerItem = {
  initial: {
    opacity: 0,
    y: 30
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] as const
    }
  }
}
