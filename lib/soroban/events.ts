import { sorobanServer, CONTRACT_IDS } from "./contract";

export type SorobanEventCallback = (event: {
  topic: string;
  contractId: string;
  data: unknown;
  timestamp: string;
}) => void;

class SorobanEventManager {
  private listeners: Set<SorobanEventCallback> = new Set();
  private isPolling = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastLedger = 0;

  public subscribe(callback: SorobanEventCallback): () => void {
    this.listeners.add(callback);
    if (!this.isPolling) {
      this.startPolling();
    }

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.stopPolling();
      }
    };
  }

  private startPolling() {
    this.isPolling = true;
    this.intervalId = setInterval(async () => {
      try {
        const contractIds = [
          CONTRACT_IDS.GROUP,
          CONTRACT_IDS.EXPENSE,
          CONTRACT_IDS.SETTLEMENT,
          CONTRACT_IDS.MONEY_REQUEST,
          CONTRACT_IDS.ACTIVITY,
        ];

        const reqOptions = {
          filters: contractIds.map((cid) => ({
            type: "contract",
            contractIds: [cid],
          })),
          limit: 10,
          ...(this.lastLedger ? { startLedger: this.lastLedger + 1 } : {}),
        };

        const eventsRes = await sorobanServer.getEvents(
          reqOptions as unknown as Parameters<typeof sorobanServer.getEvents>[0]
        );

        if (eventsRes && eventsRes.events) {
          eventsRes.events.forEach((evt) => {
            const topic = evt.topic && evt.topic.length > 0 ? evt.topic[0] : "ContractEvent";
            const eventData = {
              topic: String(topic),
              contractId: String(evt.contractId || ""),
              data: evt.value,
              timestamp: evt.ledgerClosedAt || new Date().toISOString(),
            };

            this.listeners.forEach((listener) => listener(eventData));
          });
        }
      } catch {
        // Silent catch for continuous background event polling
      }
    }, 5000);
  }

  private stopPolling() {
    this.isPolling = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const sorobanEvents = new SorobanEventManager();
