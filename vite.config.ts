import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";


interface DevEvent {
  timestamp: number;
  type: string;
  domain?: string;
  url?: string;
  title?: string;
}

const recentDevEvents: DevEvent[] = [];

function devEventsPlugin(): Plugin {
  return {
    name: "maana-dev-events-prototype",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || "";

        if (url.startsWith("/api/events") || url.startsWith("/api/health") || url.startsWith("/api/dev/recent-events")) {
          // CORS headers for extension
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

          if (req.method === "OPTIONS") {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (url.startsWith("/api/health") && req.method === "GET") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ status: "ok", mode: "local-prototype", count: recentDevEvents.length }));
            return;
          }

          if (url.startsWith("/api/dev/recent-events") && req.method === "GET") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ events: recentDevEvents }));
            return;
          }

          if (url.startsWith("/api/events") && req.method === "POST") {
            let body = "";
            req.on("data", (chunk: Buffer) => {
              body += chunk.toString();
            });
            req.on("end", () => {
              try {
                const parsed = JSON.parse(body);
                const eventRecord: DevEvent = {
                  timestamp: parsed.timestamp || Date.now(),
                  type: parsed.type || "UNKNOWN",
                  domain: parsed.domain,
                  url: parsed.url,
                  title: parsed.title,
                };
                recentDevEvents.unshift(eventRecord);
                if (recentDevEvents.length > 50) {
                  recentDevEvents.pop();
                }

                console.log(
                  `\x1b[35m[Maana Ingestion Prototype]\x1b[0m ${eventRecord.type.padEnd(16)} | ${(eventRecord.domain || "no-domain").padEnd(20)} | "${(eventRecord.title || "").slice(0, 40)}"`
                );

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    mode: "local-prototype",
                    eventCount: recentDevEvents.length,
                    received: eventRecord,
                  })
                );
              } catch (err) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "Invalid JSON body" }));
              }
            });
            return;
          }
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(), devEventsPlugin()],
  server: {
    port: 5173,
    host: true,
  },
});


