import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// CORS Preflight
http.route({
  path: "/api/events",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

// Event ingestion endpoint for the Chrome extension
http.route({
  path: "/api/events",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!rawBody || typeof rawBody !== "object") {
      return new Response(JSON.stringify({ error: "Body must be an object" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = rawBody as Record<string, unknown>;

    // 1. Authenticate caller
    const authHeader = req.headers.get("Authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

    let userId: Id<"users"> | null = null;

    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const user = await ctx.runQuery(internal.users.getUserByIdentity, {
        tokenIdentifier: identity.tokenIdentifier,
      });
      if (user) {
        userId = user._id;
      }
    }

    // Fallback: If development/extension token provided, look up or auto-provision user
    if (!userId && bearerToken) {
      const user = await ctx.runMutation(internal.users.getOrCreateDevUser, {
        token: bearerToken,
      });
      userId = user._id;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: valid session token required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Validate event payload fields
    const source =
      typeof body.source === "string" &&
      ["browser", "frontend", "github", "agentmail", "firecrawl"].includes(
        body.source
      )
        ? (body.source as "browser" | "frontend")
        : "browser";

    const type = typeof body.type === "string" ? body.type : "TAB_ACTIVE";
    const timestamp =
      typeof body.timestamp === "number" ? body.timestamp : Date.now();
    const domain = typeof body.domain === "string" ? body.domain : undefined;
    const url = typeof body.url === "string" ? body.url : undefined;
    const title = typeof body.title === "string" ? body.title : undefined;
    const tabId =
      typeof body.tabId === "string" || typeof body.tabId === "number"
        ? body.tabId
        : undefined;
    const payload =
      typeof body.payload === "object" && body.payload !== null
        ? body.payload
        : {};

    // 3. Ingest into Convex (fast clock)
    const result = await ctx.runMutation(internal.events.recordEventInternal, {
      userId,
      source,
      type,
      timestamp,
      payload,
      domain,
      url,
      title,
      tabId,
    });

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

export default http;
