import { MutationCtx, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export interface AuthenticatedUser {
  user: Doc<"users">;
  userId: Id<"users">;
  identitySubject: string;
}

/**
 * Server-side identity resolution enforcing strict per-user authorization.
 * Client-supplied user ID is NEVER an authorization source.
 */
export async function requireUser(
  ctx: QueryCtx | MutationCtx
): Promise<AuthenticatedUser> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated: valid user session required");
  }

  const subject = identity.subject;
  const user = await ctx.db
    .query("users")
    .withIndex("by_identitySubject", (q) => q.eq("identitySubject", subject))
    .first();

  if (user) {
    return { user, userId: user._id, identitySubject: subject };
  }

  // If inside a mutation context and user doesn't exist yet, auto-provision user record
  if ("insert" in ctx.db) {
    const now = Date.now();
    const newUserId = await (ctx.db as MutationCtx["db"]).insert("users", {
      identitySubject: subject,
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name ?? undefined,
      email: identity.email ?? undefined,
      createdAt: now,
      updatedAt: now,
    });
    const newUser = await ctx.db.get(newUserId);
    if (!newUser) {
      throw new Error("Failed to provision user record");
    }
    return { user: newUser, userId: newUserId, identitySubject: subject };
  }

  throw new Error("User record not found");
}

/**
 * Optional user resolution for unauthenticated/guest state checks
 */
export async function getOptionalUser(
  ctx: QueryCtx | MutationCtx
): Promise<AuthenticatedUser | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const subject = identity.subject;
  const user = await ctx.db
    .query("users")
    .withIndex("by_identitySubject", (q) => q.eq("identitySubject", subject))
    .first();

  if (!user) {
    return null;
  }

  return { user, userId: user._id, identitySubject: subject };
}
