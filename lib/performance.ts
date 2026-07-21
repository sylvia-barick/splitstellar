export interface PerformanceMetric {
  name: string;
  durationMs: number;
  timestamp: string;
  category: "api" | "rpc" | "db" | "contract";
}

class PerformanceTracker {
  private metrics: PerformanceMetric[] = [];

  public startTimer(name: string, category: "api" | "rpc" | "db" | "contract" = "api") {
    const startTime = performance.now();
    return () => {
      const durationMs = Math.round(performance.now() - startTime);
      const metric: PerformanceMetric = {
        name,
        durationMs,
        timestamp: new Date().toISOString(),
        category,
      };

      this.metrics.unshift(metric);
      if (this.metrics.length > 200) this.metrics.pop();

      return durationMs;
    };
  }

  public getAverageLatency(category?: "api" | "rpc" | "db" | "contract"): number {
    const filtered = category ? this.metrics.filter((m) => m.category === category) : this.metrics;
    if (filtered.length === 0) return 0;
    const sum = filtered.reduce((acc, m) => acc + m.durationMs, 0);
    return Math.round(sum / filtered.length);
  }

  public getMetrics(): PerformanceMetric[] {
    return this.metrics;
  }
}

export const performanceTracker = new PerformanceTracker();
