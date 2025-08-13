import { useEffect, useCallback, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import performanceService from "../services/performanceService";
import { logger } from "../utils/logger";

// Hook for tracking screen performance
export const useScreenPerformance = (
  screenName: string,
  dependencies: any[] = []
) => {
  const startTimeRef = useRef<number>(0);
  const navigation = useNavigation();

  useEffect(() => {
    // Record screen load start time
    startTimeRef.current = performance.now();

    // Track when screen is ready (after dependencies are loaded)
    const endTime = performance.now();
    const loadTime = endTime - startTimeRef.current;

    performanceService.measureScreenLoadTime(screenName, startTimeRef.current);

    logger.info("Screen loaded", {
      screenName,
      loadTime,
      dependencies: dependencies.length,
    });

    return () => {
      // Cleanup if needed
    };
  }, [screenName, ...dependencies]);

  const trackUserInteraction = useCallback(
    (interaction: string, data?: any) => {
      logger.info("User interaction", {
        screenName,
        interaction,
        data,
        timestamp: Date.now(),
      });
    },
    [screenName]
  );

  return {
    trackUserInteraction,
    loadTime: performance.now() - startTimeRef.current,
  };
};

// Hook for tracking API call performance
export const useAPIPerformance = () => {
  const trackAPICall = useCallback((endpoint: string) => {
    const startTime = performance.now();

    return {
      startTime,
      finish: () => {
        return performanceService.measureAPIResponse(endpoint, startTime);
      },
    };
  }, []);

  return { trackAPICall };
};

// Hook for tracking component render performance
export const useRenderPerformance = (componentName: string) => {
  const renderCountRef = useRef(0);
  const startTimeRef = useRef(0);

  useEffect(() => {
    renderCountRef.current += 1;

    if (renderCountRef.current === 1) {
      startTimeRef.current = performance.now();
    }

    // Log render performance for components that render frequently
    if (renderCountRef.current > 10 && renderCountRef.current % 5 === 0) {
      const avgRenderTime =
        (performance.now() - startTimeRef.current) / renderCountRef.current;

      if (avgRenderTime > 16) {
        // 60fps threshold
        logger.warn("Component rendering slowly", {
          componentName,
          renderCount: renderCountRef.current,
          avgRenderTime,
        });
      }
    }
  });

  return {
    renderCount: renderCountRef.current,
  };
};

// Hook for monitoring FPS drops
export const useFPSMonitoring = (threshold: number = 45) => {
  const fpsWarningShownRef = useRef(false);

  useEffect(() => {
    const checkFPS = () => {
      const currentFPS = performanceService.getCurrentFPS();

      if (
        currentFPS > 0 &&
        currentFPS < threshold &&
        !fpsWarningShownRef.current
      ) {
        logger.warn("Low FPS detected", {
          currentFPS,
          threshold,
        });

        fpsWarningShownRef.current = true;

        // Reset warning flag after 30 seconds
        setTimeout(() => {
          fpsWarningShownRef.current = false;
        }, 30000);
      }
    };

    const interval = setInterval(checkFPS, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [threshold]);
};

// Hook for performance budgets
export const usePerformanceBudget = (
  screenName: string,
  budget: {
    loadTime?: number;
    apiCalls?: number;
    renderTime?: number;
  }
) => {
  const violationsRef = useRef<string[]>([]);

  const checkBudget = useCallback(
    (metric: string, value: number, budgetValue?: number) => {
      if (!budgetValue) return;

      if (value > budgetValue) {
        const violation = `${metric} exceeded: ${value}ms > ${budgetValue}ms`;

        if (!violationsRef.current.includes(violation)) {
          violationsRef.current.push(violation);

          logger.warn("Performance budget exceeded", {
            screenName,
            metric,
            value,
            budget: budgetValue,
            violation,
          });
        }
      }
    },
    [screenName]
  );

  return {
    checkBudget,
    violations: violationsRef.current,
    clearViolations: () => {
      violationsRef.current = [];
    },
  };
};

// Hook for lazy loading performance
export const useLazyLoadPerformance = (componentName: string) => {
  const loadStartRef = useRef(0);
  const isLoadedRef = useRef(false);

  const startLoading = useCallback(() => {
    if (!isLoadedRef.current) {
      loadStartRef.current = performance.now();
    }
  }, []);

  const finishLoading = useCallback(() => {
    if (!isLoadedRef.current && loadStartRef.current > 0) {
      const loadTime = performance.now() - loadStartRef.current;

      logger.info("Lazy component loaded", {
        componentName,
        loadTime,
      });

      // Track slow lazy loads
      if (loadTime > 1000) {
        logger.warn("Slow lazy component load", {
          componentName,
          loadTime,
        });
      }

      isLoadedRef.current = true;
    }
  }, [componentName]);

  return {
    startLoading,
    finishLoading,
    isLoaded: isLoadedRef.current,
  };
};

// Hook for memory monitoring
export const useMemoryMonitoring = (
  componentName: string,
  warningThreshold: number = 50 * 1024 * 1024
) => {
  const memoryWarningShownRef = useRef(false);

  useEffect(() => {
    const checkMemory = () => {
      const currentMemory = performanceService.getCurrentMemoryUsage();

      if (currentMemory > warningThreshold && !memoryWarningShownRef.current) {
        logger.warn("High memory usage detected", {
          componentName,
          currentMemory,
          threshold: warningThreshold,
        });

        memoryWarningShownRef.current = true;

        // Reset warning after 60 seconds
        setTimeout(() => {
          memoryWarningShownRef.current = false;
        }, 60000);
      }
    };

    const interval = setInterval(checkMemory, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [componentName, warningThreshold]);
};

// Hook for performance debugging in development
export const usePerformanceDebug = (enabled: boolean = __DEV__) => {
  const performanceData = useRef<{
    screenLoads: Record<string, number>;
    apiCalls: Record<string, number[]>;
    renders: Record<string, number>;
  }>({
    screenLoads: {},
    apiCalls: {},
    renders: {},
  });

  const logPerformanceData = useCallback(() => {
    if (enabled) {
      console.log("=== Performance Debug Data ===");
      console.log("Screen Load Times:", performanceData.current.screenLoads);
      console.log("API Response Times:", performanceData.current.apiCalls);
      console.log("Component Renders:", performanceData.current.renders);
      console.log("Current FPS:", performanceService.getCurrentFPS());
      console.log(
        "Performance Report:",
        performanceService.getPerformanceReport()
      );
    }
  }, [enabled]);

  const trackDebugData = useCallback(
    (type: string, key: string, value: number) => {
      if (enabled) {
        switch (type) {
          case "screenLoad":
            performanceData.current.screenLoads[key] = value;
            break;
          case "apiCall":
            if (!performanceData.current.apiCalls[key]) {
              performanceData.current.apiCalls[key] = [];
            }
            performanceData.current.apiCalls[key].push(value);
            break;
          case "render":
            performanceData.current.renders[key] =
              (performanceData.current.renders[key] || 0) + 1;
            break;
        }
      }
    },
    [enabled]
  );

  useEffect(() => {
    if (enabled) {
      // Log performance data every 30 seconds in development
      const interval = setInterval(logPerformanceData, 30000);
      return () => clearInterval(interval);
    }
  }, [enabled, logPerformanceData]);

  return {
    logPerformanceData,
    trackDebugData,
    enabled,
  };
};

export default {
  useScreenPerformance,
  useAPIPerformance,
  useRenderPerformance,
  useFPSMonitoring,
  usePerformanceBudget,
  useLazyLoadPerformance,
  useMemoryMonitoring,
  usePerformanceDebug,
};
