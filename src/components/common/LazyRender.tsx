import React, { ReactNode } from 'react';
import { useInView } from 'react-intersection-observer';

interface LazyRenderProps {
    children: ReactNode;
    placeholder?: ReactNode;
    /**
     * Root margin for IntersectionObserver.
     * Default is '100% 0px' (one viewport height ahead).
     */
    rootMargin?: string;
    /**
     * Whether to keep the component mounted once it has been triggered.
     * Default is true.
     */
    triggerOnce?: boolean;
    className?: string;
}

/**
 * LazyRender
 *
 * Renders its children only when the component enters the viewport (or is near it).
 * Useful for optimizing lists of heavy components.
 */
export function LazyRender({
    children,
    placeholder,
    rootMargin = '200% 0px', // Load 2 viewport heights ahead to pre-load earlier and reduce visible skeleton flash
    triggerOnce = true,
    className
}: LazyRenderProps) {
    const { ref, inView } = useInView({
        rootMargin,
        triggerOnce,
    });

    return (
        <div ref={ref} className={className}>
            {inView ? (
                children
            ) : (
                placeholder || <div className="h-full w-full min-h-[100px]" />
            )}
        </div>
    );
}
