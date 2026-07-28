import { describe, it, expect } from "vitest";
import express from "express";
import http from "node:http";
import healthRouter from "./routes/health";
import "./__tests__/helpers";

function httpGet(path: string): Promise<{ status: number; body: string }> {
  const app = express();
  app.use("/api", healthRouter);

  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        server.close();
        reject(new Error("Could not bind ephemeral port"));
        return;
      }

      http
        .get(`http://127.0.0.1:${addr.port}${path}`, (res) => {
          let body = "";
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", () => {
            server.close(() => {
              resolve({ status: res.statusCode ?? 0, body });
            });
          });
        })
        .on("error", (err) => {
          server.close(() => reject(err));
        });
    });
  });
}

describe("health probes (P0 smoke)", () => {
  it("GET /api/healthz is liveness without auth", async () => {
    const res = await httpGet("/api/healthz");
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: "ok" });
  });

  it("GET /api/livez is liveness alias", async () => {
    const res = await httpGet("/api/livez");
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: "ok" });
  });

  it("GET /api/readyz is 200 when Postgres is reachable", async () => {
    const res = await httpGet("/api/readyz");
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as { status: string; checks?: Record<string, string> };
    expect(body.status).toBe("ok");
    expect(body.checks?.database).toBe("ok");
  });
});
