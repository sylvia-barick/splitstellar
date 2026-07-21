export interface QueuedAction {
  id: string;
  url: string;
  method: "POST" | "PUT" | "DELETE";
  payload: any;
  timestamp: string;
  retryCount: number;
}

class OfflineQueue {
  private STORAGE_KEY = "splitstellar-offline-queue";

  public getQueue(): QueuedAction[] {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: QueuedAction[]) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    } catch {
      // Local storage full or unavailable
    }
  }

  public enqueue(url: string, method: "POST" | "PUT" | "DELETE", payload: any): QueuedAction {
    const action: QueuedAction = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      url,
      method,
      payload,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    const queue = this.getQueue();
    queue.push(action);
    this.saveQueue(queue);

    return action;
  }

  public async processQueue(): Promise<number> {
    const queue = this.getQueue();
    if (queue.length === 0) return 0;

    let processedCount = 0;
    const remaining: QueuedAction[] = [];

    for (const action of queue) {
      try {
        const res = await fetch(action.url, {
          method: action.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action.payload),
        });

        if (res.ok) {
          processedCount++;
        } else {
          action.retryCount++;
          if (action.retryCount < 5) remaining.push(action);
        }
      } catch {
        action.retryCount++;
        if (action.retryCount < 5) remaining.push(action);
      }
    }

    this.saveQueue(remaining);
    return processedCount;
  }
}

export const offlineQueue = new OfflineQueue();
