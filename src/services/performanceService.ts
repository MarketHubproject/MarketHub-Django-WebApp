import {
  performance,
  PerformanceObserver,
} from "@shopify/react-native-performance";
import { logger } from "../utils/logger";
import { offlineStorage } from "./mmkvStorage";

// Performance metrics types
interface PerformanceMetrics {
  fps: number[];
  memoryUsage: number[];
  ttfb: number; // Time to First Byte
  tti: number; // Time to Interactive
  screenLoadTimes: Record<string, number>;
  apiResponseTimes: Record<string, number[]>;
}

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  FPS: {
    GOOD: 55,
    AVERAGE: 45,
    POOR: 30,
  },
  MEMORY: {
    WARNING: 100 * 1024 * 1024, // 100MB
    CRITICAL: 200 * 1024 * 1024, // 200MB
  },
  SCREEN_LOAD: {
    GOOD: 1000, // 1 second
    AVERAGE: 2000, // 2 seconds
    POOR: 3000, // 3 seconds
  },
  API_RESPONSE: {
    GOOD: 500, // 500ms
    AVERAGE: 1000, // 1 second
    POOR: 2000, // 2 seconds
  },
};

class PerformanceService {
  private metrics: PerformanceMetrics = {
    fps: [],
    memoryUsage: [],
    ttfb: 0,
    tti: 0,
    screenLoadTimes: {},
    apiResponseTimes: {},
  };

  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;
  private fpsInterval?: NodeJS.Timeout;
  private memoryInterval?: NodeJS.Timeout;

  async initialize() {
    try {
      if (this.isMonitoring) return;

      // Setup performance observers
      this.setupPerformanceObservers();

      // Start FPS monitoring
      this.startFPSMonitoring();

      // Start memory monitoring
      this.startMemoryMonitoring();

      // Load existing metrics from storage
      await this.loadMetricsFromStorage();

      this.isMonitoring = true;
      logger.info("Performance monitoring initialized");
    } catch (error) {
      logger.error("Failed to initialize performance monitoring", error, {
        component: "PerformanceService",
      });
    }
  }

  private setupPerformanceObservers() {
    try {
      // Observe navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === "navigation") {
            this.metrics.ttfb = entry.responseStart - entry.fetchStart;
            this.metrics.tti = entry.loadEventEnd - entry.fetchStart;

            logger.info("Navigation timing captured", {
              ttfb: this.metrics.ttfb,
              tti: this.metrics.tti,
            });
          }
        });
      });

      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === "resource" && entry.name.includes("api")) {
            const responseTime = entry.responseEnd - entry.startTime;
            const endpoint = this.extractEndpointFromURL(entry.name);

            if (!this.metrics.apiResponseTimes[endpoint]) {
              this.metrics.apiResponseTimes[endpoint] = [];
            }

            this.metrics.apiResponseTimes[endpoint].push(responseTime);

            // Keep only last 50 measurements per endpoint
            if (this.metrics.apiResponseTimes[endpoint].length > 50) {
              this.metrics.apiResponseTimes[endpoint] =
                this.metrics.apiResponseTimes[endpoint].slice(-50);
            }

            // Log slow API responses
            if (responseTime > PERFORMANCE_THRESHOLDS.API_RESPONSE.POOR) {
              logger.warn("Slow API response detected", {
                endpoint,
                responseTime,
                threshold: PERFORMANCE_THRESHOLDS.API_RESPONSE.POOR,
              });
            }
          }
        });
      });

      navigationObserver.observe({ entryTypes: ["navigation"] });
      resourceObserver.observe({ entryTypes: ["resource"] });

      this.observers.push(navigationObserver, resourceObserver);
    } catch (error) {
      logger.error("Failed to setup performance observers", error);
    }
  }

  private startFPSMonitoring() {
    let lastTime = performance.now();
    let frameCount = 0;

    const measureFPS = () => {
      const currentTime = performance.now();
      frameCount++;

      if (currentTime - lastTime >= 1000) {
        // Every second
        const fps = (frameCount * 1000) / (currentTime - lastTime);
        this.metrics.fps.push(fps);

        // Keep only last 100 FPS measurements
        if (this.metrics.fps.length > 100) {
          this.metrics.fps = this.metrics.fps.slice(-100);
        }

        // Log poor performance
        if (fps < PERFORMANCE_THRESHOLDS.FPS.POOR) {
          logger.warn("Poor FPS detected", {
            fps,
            threshold: PERFORMANCE_THRESHOLDS.FPS.POOR,
          });
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  private startMemoryMonitoring() {
    this.memoryInterval = setInterval(() => {
      try {
        // Note: React Native doesn't provide direct memory access
        // This is a placeholder for when the feature becomes available
        const memoryUsage = this.getMemoryUsage();

        if (memoryUsage) {
          this.metrics.memoryUsage.push(memoryUsage);

          // Keep only last 100 memory measurements
          if (this.metrics.memoryUsage.length > 100) {
            this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
          }

          // Log memory warnings
          if (memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY.WARNING) {
            logger.warn("High memory usage detected", {
              memoryUsage,
              threshold: PERFORMANCE_THRESHOLDS.MEMORY.WARNING,
            });
          }

          if (memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY.CRITICAL) {
            logger.error("Critical memory usage detected", {
              memoryUsage,
              threshold: PERFORMANCE_THRESHOLDS.MEMORY.CRITICAL,
            });
          }
        }
      } catch (error) {
        logger.error("Failed to monitor memory usage", error);
      }
    }, 5000); // Every 5 seconds
  }

  private getMemoryUsage(): number | null {
    // Placeholder for memory usage measurement
    // In a real implementation, this would use native modules
    // or platform-specific APIs to get actual memory usage
    return null;
  }

  private extractEndpointFromURL(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split("/").filter(Boolean);
      return pathSegments.slice(0, 2).join("/"); // Take first 2 path segments
    } catch {
      return "unknown";
    }
  }

  // Public methods for tracking custom performance metrics

  measureScreenLoadTime(screenName: string, startTime?: number) {
    const endTime = performance.now();
    const loadTime = startTime ? endTime - startTime : endTime;

    this.metrics.screenLoadTimes[screenName] = loadTime;

    // Log slow screen loads
    if (loadTime > PERFORMANCE_THRESHOLDS.SCREEN_LOAD.POOR) {
      logger.warn("Slow screen load detected", {
        screenName,
        loadTime,
        threshold: PERFORMANCE_THRESHOLDS.SCREEN_LOAD.POOR,
      });
    }

    logger.info("Screen load time measured", {
      screenName,
      loadTime,
    });

    return loadTime;
  }

  measureAPIResponse(endpoint: string, startTime: number) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    if (!this.metrics.apiResponseTimes[endpoint]) {
      this.metrics.apiResponseTimes[endpoint] = [];
    }

    this.metrics.apiResponseTimes[endpoint].push(responseTime);

    // Keep only last 50 measurements per endpoint
    if (this.metrics.apiResponseTimes[endpoint].length > 50) {
      this.metrics.apiResponseTimes[endpoint] =
        this.metrics.apiResponseTimes[endpoint].slice(-50);
    }

    return responseTime;
  }

  // Analytics and reporting methods

  getPerformanceReport() {
    const report = {
      averageFPS: this.calculateAverage(this.metrics.fps),
      fpsDistribution: this.getFPSDistribution(),
      averageMemoryUsage: this.calculateAverage(this.metrics.memoryUsage),
      screenLoadTimes: this.metrics.screenLoadTimes,
      apiResponseTimes: this.getAPIResponseSummary(),
      ttfb: this.metrics.ttfb,
      tti: this.metrics.tti,
      timestamp: Date.now(),
    };

    logger.info("Performance report generated", report);
    return report;
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private getFPSDistribution() {
    const fps = this.metrics.fps;
    if (fps.length === 0) return { good: 0, average: 0, poor: 0 };

    const good = fps.filter((f) => f >= PERFORMANCE_THRESHOLDS.FPS.GOOD).length;
    const average = fps.filter(
      (f) =>
        f >= PERFORMANCE_THRESHOLDS.FPS.AVERAGE &&
        f < PERFORMANCE_THRESHOLDS.FPS.GOOD
    ).length;
    const poor = fps.filter(
      (f) => f < PERFORMANCE_THRESHOLDS.FPS.AVERAGE
    ).length;

    return {
      good: (good / fps.length) * 100,
      average: (average / fps.length) * 100,
      poor: (poor / fps.length) * 100,
    };
  }

  private getAPIResponseSummary() {
    const summary: Record<string, { average: number; count: number }> = {};

    Object.entries(this.metrics.apiResponseTimes).forEach(
      ([endpoint, times]) => {
        summary[endpoint] = {
          average: this.calculateAverage(times),
          count: times.length,
        };
      }
    );

    return summary;
  }

  // Storage methods

  private async loadMetricsFromStorage() {
    try {
      const storedMetrics = offlineStorage.getAppSetting("performanceMetrics");
      if (storedMetrics) {
        // Merge with existing metrics, keeping recent data
        this.metrics = { ...this.metrics, ...storedMetrics };
      }
    } catch (error) {
      logger.error("Failed to load performance metrics from storage", error);
    }
  }

  async saveMetricsToStorage() {
    try {
      // Only save essential metrics to avoid storage bloat
      const essentialMetrics = {
        screenLoadTimes: this.metrics.screenLoadTimes,
        ttfb: this.metrics.ttfb,
        tti: this.metrics.tti,
      };

      offlineStorage.setAppSetting("performanceMetrics", essentialMetrics);
    } catch (error) {
      logger.error("Failed to save performance metrics to storage", error);
    }
  }

  // Cleanup and optimization

  async cleanup() {
    try {
      // Stop monitoring
      this.isMonitoring = false;

      // Clear intervals
      if (this.fpsInterval) {
        clearInterval(this.fpsInterval);
      }
      if (this.memoryInterval) {
        clearInterval(this.memoryInterval);
      }

      // Disconnect observers
      this.observers.forEach((observer) => {
        try {
          observer.disconnect();
        } catch (error) {
          logger.warn("Failed to disconnect performance observer", error);
        }
      });
      this.observers = [];

      // Save metrics before cleanup
      await this.saveMetricsToStorage();

      logger.info("Performance monitoring cleaned up");
    } catch (error) {
      logger.error("Failed to cleanup performance monitoring", error);
    }
  }

  // Public getters

  getCurrentFPS(): number {
    return this.metrics.fps.length > 0
      ? this.metrics.fps[this.metrics.fps.length - 1]
      : 0;
  }

  getCurrentMemoryUsage(): number {
    return this.metrics.memoryUsage.length > 0
      ? this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1]
      : 0;
  }

  isPerformanceGood(): boolean {
    const avgFPS = this.calculateAverage(this.metrics.fps);
    const currentMemory = this.getCurrentMemoryUsage();

    return (
      avgFPS >= PERFORMANCE_THRESHOLDS.FPS.GOOD &&
      currentMemory < PERFORMANCE_THRESHOLDS.MEMORY.WARNING
    );
  }
}

export const performanceService = new PerformanceService();
export default performanceService;
