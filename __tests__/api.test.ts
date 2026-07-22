import { describe, it, expect } from "vitest";
import { GET as apiRouterGET } from "@/app/api/[[...slug]]/route";
import { NextRequest } from "next/server";

describe("SplitStellar Backend API Verification Tests", () => {
  it("GET /api/health should return 200 OK with correct status and uptime", async () => {
    const request = new NextRequest("http://localhost/api/health");
    const response = await apiRouterGET(request, { params: Promise.resolve({ slug: ["health"] }) });
    expect(response.status).toBe(200);

    const body = await response.json() as {
      status: string;
      service: string;
      uptimeSeconds: number;
      timestamp: string;
    };
    
    expect(body.status).toBe("ok");
    expect(body.service).toBe("SplitStellar API Server");
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(body.timestamp).toBeDefined();
  });

  it("GET /api/status should return 200 OK with operational subsystems", async () => {
    const request = new NextRequest("http://localhost/api/status");
    const response = await apiRouterGET(request, { params: Promise.resolve({ slug: ["status"] }) });
    expect(response.status).toBe(200);

    const body = await response.json() as {
      status: string;
      subsystems: {
        apiServer: string;
        database: string;
        indexer: string;
        sorobanRpc: string;
      };
      metrics: {
        groups: number;
        expenses: number;
        payments: number;
        requests: number;
      };
      timestamp: string;
    };

    expect(body.status).toBe("operational");
    expect(body.subsystems.apiServer).toBe("healthy");
    expect(body.subsystems.database).toBe("connected");
    expect(body.subsystems.indexer).toBe("active");
    expect(body.subsystems.sorobanRpc).toBe("connected");
    expect(body.metrics).toBeDefined();
    expect(typeof body.metrics.groups).toBe("number");
  });
});

