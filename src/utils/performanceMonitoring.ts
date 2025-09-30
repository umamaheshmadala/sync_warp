import { onCLS, onFID, onFCP, onLCP, onTTFB, Metric } from 'web-vitals';

/**
 * Performance Monitoring Utility
 * Tracks Core Web Vitals and custom performance metrics
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  timestamp: number;
}

export interface CustomMetric {
  name: string;
  value: number;
  unit?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private customMetrics: Map<string, CustomMetric[]> = new Map();
  private listeners: Array<(metric: PerformanceMetric | CustomMetric) => void> = [];
  private isProduction = import.meta.env.PROD;

  constructor() {
    this.initWebVitals();
  }

  /**
   * Initialize Web Vitals tracking
   */
  private initWebVitals() {
    if (typeof window === 'undefined') return;

    // Track Core Web Vitals
    onCLS(this.handleMetric.bind(this));
    onFID(this.handleMetric.bind(this));
    onFCP(this.handleMetric.bind(this));
    onLCP(this.handleMetric.bind(this));
    onTTFB(this.handleMetric.bind(this));
  }

  /**
   * Handle Web Vitals metric
   */
  private handleMetric(metric: Metric) {
    const performanceMetric: PerformanceMetric = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating as 'good' | 'needs-improvement' | 'poor',
      delta: metric.delta,
      id: metric.id,
      timestamp: Date.now(),
    };

    this.metrics.set(metric.name, performanceMetric);
    this.notifyListeners(performanceMetric);

    // Log in development
    if (!this.isProduction) {
      console.log(`[Performance] ${metric.name}:`, {
        value: `${metric.value.toFixed(2)}ms`,
        rating: metric.rating,
      });
    }

    // Send to analytics in production
    if (this.isProduction) {
      this.sendToAnalytics(performanceMetric);
    }
  }

  /**
   * Track custom performance metric
   */
  public trackCustomMetric(
    name: string,
    value: number,
    unit?: string,
    metadata?: Record<string, any>
  ) {
    const metric: CustomMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata,
    };

    if (!this.customMetrics.has(name)) {
      this.customMetrics.set(name, []);
    }

    this.customMetrics.get(name)!.push(metric);
    this.notifyListeners(metric);

    if (!this.isProduction) {
      console.log(`[Custom Metric] ${name}:`, {
        value: unit ? `${value}${unit}` : value,
        metadata,
      });
    }
  }

  /**
   * Measure function execution time
   */
  public async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.trackCustomMetric(name, duration, 'ms', metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.trackCustomMetric(name, duration, 'ms', {
        ...metadata,
        error: true,
      });
      throw error;
    }
  }

  /**
   * Measure synchronous function execution time
   */
  public measure<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.trackCustomMetric(name, duration, 'ms', metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.trackCustomMetric(name, duration, 'ms', {
        ...metadata,
        error: true,
      });
      throw error;
    }
  }

  /**
   * Start a performance mark
   */
  public mark(name: string) {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  }

  /**
   * Measure between two marks
   */
  public measureBetween(
    measureName: string,
    startMark: string,
    endMark: string
  ) {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.measure(measureName, startMark, endMark);
        const measure = performance.getEntriesByName(measureName)[0];
        if (measure) {
          this.trackCustomMetric(measureName, measure.duration, 'ms');
        }
      } catch (error) {
        console.warn('Failed to measure between marks:', error);
      }
    }
  }

  /**
   * Get all tracked metrics
   */
  public getMetrics(): Map<string, PerformanceMetric> {
    return new Map(this.metrics);
  }

  /**
   * Get custom metrics
   */
  public getCustomMetrics(name?: string): CustomMetric[] {
    if (name) {
      return this.customMetrics.get(name) || [];
    }

    const allMetrics: CustomMetric[] = [];
    this.customMetrics.forEach((metrics) => allMetrics.push(...metrics));
    return allMetrics;
  }

  /**
   * Get metric statistics
   */
  public getMetricStats(name: string): {
    average: number;
    min: number;
    max: number;
    count: number;
  } | null {
    const metrics = this.customMetrics.get(name);
    if (!metrics || metrics.length === 0) return null;

    const values = metrics.map((m) => m.value);
    return {
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  /**
   * Subscribe to metric updates
   */
  public subscribe(
    listener: (metric: PerformanceMetric | CustomMetric) => void
  ) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(metric: PerformanceMetric | CustomMetric) {
    this.listeners.forEach((listener) => {
      try {
        listener(metric);
      } catch (error) {
        console.error('Error in performance listener:', error);
      }
    });
  }

  /**
   * Send metrics to analytics service
   */
  private sendToAnalytics(metric: PerformanceMetric) {
    // Implement your analytics service integration here
    // Example: Google Analytics, custom backend, etc.
    
    // For now, we'll just store it
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'web_vitals', {
        event_category: 'Web Vitals',
        event_label: metric.name,
        value: Math.round(metric.value),
        metric_rating: metric.rating,
        non_interaction: true,
      });
    }
  }

  /**
   * Get performance report
   */
  public getReport(): {
    webVitals: Record<string, PerformanceMetric>;
    customMetrics: Record<string, CustomMetric[]>;
    summary: {
      totalMetrics: number;
      poorMetrics: number;
      goodMetrics: number;
    };
  } {
    const webVitals: Record<string, PerformanceMetric> = {};
    this.metrics.forEach((value, key) => {
      webVitals[key] = value;
    });

    const customMetrics: Record<string, CustomMetric[]> = {};
    this.customMetrics.forEach((value, key) => {
      customMetrics[key] = value;
    });

    const poorMetrics = Array.from(this.metrics.values()).filter(
      (m) => m.rating === 'poor'
    ).length;

    const goodMetrics = Array.from(this.metrics.values()).filter(
      (m) => m.rating === 'good'
    ).length;

    return {
      webVitals,
      customMetrics,
      summary: {
        totalMetrics: this.metrics.size,
        poorMetrics,
        goodMetrics,
      },
    };
  }

  /**
   * Clear all metrics
   */
  public clear() {
    this.metrics.clear();
    this.customMetrics.clear();
  }

  /**
   * Log performance report to console
   */
  public logReport() {
    const report = this.getReport();
    console.group('📊 Performance Report');
    console.log('Web Vitals:', report.webVitals);
    console.log('Custom Metrics:', report.customMetrics);
    console.log('Summary:', report.summary);
    console.groupEnd();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export utility functions
export const trackMetric = (
  name: string,
  value: number,
  unit?: string,
  metadata?: Record<string, any>
) => performanceMonitor.trackCustomMetric(name, value, unit, metadata);

export const measureAsync = <T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
) => performanceMonitor.measureAsync(name, fn, metadata);

export const measure = <T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, any>
) => performanceMonitor.measure(name, fn, metadata);

export const getPerformanceReport = () => performanceMonitor.getReport();

export const logPerformanceReport = () => performanceMonitor.logReport();