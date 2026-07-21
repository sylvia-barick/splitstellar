import { sorobanEvents } from "@/lib/soroban/events";

export interface IndexerStatus {
  isRunning: boolean;
  lastIndexedTime: string;
  processedEventsCount: number;
}

class IndexerService {
  private isRunning = false;
  private processedCount = 0;
  private lastIndexed = new Date().toISOString();

  public init() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      sorobanEvents.subscribe((event) => {
        this.processedCount += 1;
        this.lastIndexed = event.timestamp || new Date().toISOString();
        this.handleEvent(event);
      });
    } catch (err) {
      console.warn("IndexerService init error:", err);
    }
  }

  private async handleEvent(event: { topic: string; contractId: string; data: unknown; timestamp: string }) {
    try {
      // Trigger background sync API
      await fetch("/api/indexer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reindex", event }),
      });
    } catch {
      // Silent catch
    }
  }

  public getStatus(): IndexerStatus {
    return {
      isRunning: this.isRunning,
      lastIndexedTime: this.lastIndexed,
      processedEventsCount: this.processedCount,
    };
  }
}

export const indexerService = new IndexerService();
