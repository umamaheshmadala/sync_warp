import { useEffect, useCallback, useRef, useState } from 'react';
import {
  performanceMonitor,
  PerformanceMetric,
  CustomMetric,
} from '../utils/performanceMonitoring';

/**
 * Hook to track component render performance
 */
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0);
  const mountTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;

    // Track first render time
    if (renderCount.current === 1) {
      const timeToMount = Date.now() - mountTime.current;
      performanceMonitor.trackCustomMetric(
        `component-mount:${componentName}`,
        timeToMount,
        'ms'
      );
    }

    // Track excessive re-renders
    if (renderCount.current > 10) {
      performanceMonitor.trackCustomMetric(
        `excessive-renders:${componentName}`,
        renderCount.current,
        'count'
      );
    }
  });

  return {
    renderCount: renderCount.current,
  };
}

/**
 * Hook to measure async operations
 */
export function usePerformanceMeasure() {
  const measureAsync = useCallback(
    async <T,>(name: string, fn: () => Promise<T>): Promise<T> => {
      return performanceMonitor.measureAsync(name, fn);
    },
    []
  );

  const measure = useCallback(<T,>(name: string, fn: () => T): T => {
    return performanceMonitor.measure(name, fn);
  }, []);

  const trackMetric = useCallback(
    (name: string, value: number, unit?: string, metadata?: Record<string, any>) => {
      performanceMonitor.trackCustomMetric(name, value, unit, metadata);
    },
    []
  );

  return {
    measureAsync,
    measure,
    trackMetric,
  };
}

/**
 * Hook to track performance metrics
 */
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<Map<string, PerformanceMetric>>(
    new Map()
  );
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([]);

  useEffect(() => {
    // Subscribe to performance updates
    const unsubscribe = performanceMonitor.subscribe((metric) => {
      if ('rating' in metric) {
        // Web Vital
        setMetrics((prev) => new Map(prev).set(metric.name, metric));
      } else {
        // Custom metric
        setCustomMetrics((prev) => [...prev, metric]);
      }
    });

    // Get initial metrics
    setMetrics(performanceMonitor.getMetrics());
    setCustomMetrics(performanceMonitor.getCustomMetrics());

    return unsubscribe;
  }, []);

  const getReport = useCallback(() => {
    return performanceMonitor.getReport();
  }, []);

  const clearMetrics = useCallback(() => {
    performanceMonitor.clear();
    setMetrics(new Map());
    setCustomMetrics([]);
  }, []);

  return {
    metrics,
    customMetrics,
    getReport,
    clearMetrics,
  };
}

/**
 * Hook to track page/route performance
 */
export function usePagePerformance(pageName: string) {
  const loadStartTime = useRef(performance.now());

  useEffect(() => {
    // Mark page start
    performanceMonitor.mark(`${pageName}-start`);

    // Track page load time
    const loadTime = performance.now() - loadStartTime.current;
    performanceMonitor.trackCustomMetric(
      `page-load:${pageName}`,
      loadTime,
      'ms'
    );

    return () => {
      // Mark page end
      performanceMonitor.mark(`${pageName}-end`);

      // Measure total time on page
      try {
        performanceMonitor.measureBetween(
          `page-duration:${pageName}`,
          `${pageName}-start`,
          `${pageName}-end`
        );
      } catch (error) {
        // Marks might not exist
      }
    };
  }, [pageName]);
}

/**
 * Hook to track API call performance
 */
export function useAPIPerformance() {
  const trackAPICall = useCallback(
    async <T,>(
      endpoint: string,
      fn: () => Promise<T>,
      metadata?: Record<string, any>
    ): Promise<T> => {
      const metricName = `api-call:${endpoint}`;
      return performanceMonitor.measureAsync(metricName, fn, {
        endpoint,
        ...metadata,
      });
    },
    []
  );

  return {
    trackAPICall,
  };
}

/**
 * Hook to measure component lifecycle
 */
export function useLifecyclePerformance(componentName: string) {
  const mountTime = useRef<number>();
  const updateCount = useRef(0);

  useEffect(() => {
    // Track mount
    if (!mountTime.current) {
      mountTime.current = performance.now();
      performanceMonitor.trackCustomMetric(
        `lifecycle-mount:${componentName}`,
        mountTime.current,
        'ms'
      );
    }

    // Track updates
    updateCount.current += 1;
    if (updateCount.current > 1) {
      performanceMonitor.trackCustomMetric(
        `lifecycle-update:${componentName}`,
        updateCount.current,
        'count'
      );
    }

    return () => {
      // Track unmount
      if (mountTime.current) {
        const lifeDuration = performance.now() - mountTime.current;
        performanceMonitor.trackCustomMetric(
          `lifecycle-duration:${componentName}`,
          lifeDuration,
          'ms'
        );
      }
    };
  });

  return {
    updateCount: updateCount.current,
  };
}

/**
 * Hook to track image loading performance
 */
export function useImagePerformance() {
  const trackImageLoad = useCallback(
    (imageSrc: string, loadTime: number) => {
      performanceMonitor.trackCustomMetric(
        'image-load',
        loadTime,
        'ms',
        { src: imageSrc }
      );
    },
    []
  );

  return {
    trackImageLoad,
  };
}

/**
 * Hook for performance budget tracking
 */
export function usePerformanceBudget(budget: {
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  FCP?: number; // First Contentful Paint
  TTFB?: number; // Time to First Byte
}) {
  const [violations, setViolations] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe((metric) => {
      if (!('rating' in metric)) return;

      const metricBudget = budget[metric.name as keyof typeof budget];
      if (metricBudget && metric.value > metricBudget) {
        setViolations((prev) => [
          ...prev,
          `${metric.name} exceeded budget: ${metric.value.toFixed(2)}ms > ${metricBudget}ms`,
        ]);
      }
    });

    return unsubscribe;
  }, [budget]);

  const clearViolations = useCallback(() => {
    setViolations([]);
  }, []);

  return {
    violations,
    clearViolations,
    hasViolations: violations.length > 0,
  };
}