import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

export const getViewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();
  },
});

export const getUserByIdentity = internalQuery({
  args: {
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier)
      )
      .first();
  },
});

export const getOrCreateDevUser = internalMutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", args.token)
      )
      .first();

    if (existing) {
      return existing;
    }

    const now = Date.now();
    const newUserId = await ctx.db.insert("users", {
      identitySubject: `ext_${args.token}`,
      tokenIdentifier: args.token,
      name: "Local Browser User",
      createdAt: now,
      updatedAt: now,
    });

    const created = await ctx.db.get(newUserId);
    if (!created) throw new Error("Failed to create dev user");
    return created;
  },
});
