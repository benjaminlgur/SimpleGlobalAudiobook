import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  assertOwnership,
  matchesUserId,
  resolveAuthIdentity,
  type ResolvedAuthIdentity,
} from "./lib/auth";
import { checkRateLimit } from "./lib/limits";


const positionReturnValidator = v.object({
  _id: v.id("positions"),
  _creationTime: v.number(),
  audiobookId: v.id("audiobooks"),
  chapterIndex: v.number(),
  positionMs: v.number(),
  updatedAt: v.number(),
  userId: v.optional(v.string()),
});

async function resolveCanonicalId(
  ctx: QueryCtx | MutationCtx,
  audiobookId: Id<"audiobooks">,
  identity: ResolvedAuthIdentity,
): Promise<Id<"audiobooks">> {
  const links = await ctx.db
    .query("audiobookLinks")
    .withIndex("by_linked", (q) => q.eq("linkedId", audiobookId))
    .collect();
  const ownedLink = links.find((link) => matchesUserId(link.userId, identity));
  return ownedLink ? ownedLink.canonicalId : audiobookId;
}

function getLatestOwnedPosition(
  rows: Doc<"positions">[],
  identity: ResolvedAuthIdentity,
): Doc<"positions"> | null {
  const ownedRows = rows.filter((row) => matchesUserId(row.userId, identity));
  if (ownedRows.length === 0) {
    return null;
  }

  ownedRows.sort((a, b) => b.updatedAt - a.updatedAt);
  return ownedRows[0] ?? null;
}

export const get = query({
  args: { audiobookId: v.id("audiobooks") },
  returns: v.union(positionReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const identity = await resolveAuthIdentity(ctx);

    const book = await ctx.db.get(args.audiobookId);
    await assertOwnership(ctx, book);

    const canonicalId = await resolveCanonicalId(ctx, args.audiobookId, identity);
    const existing = await ctx.db
      .query("positions")
      .withIndex("by_user_and_audiobook", (q) =>
        q.eq("userId", identity.userId).eq("audiobookId", canonicalId),
      )
      .unique();
    if (existing) {
      return existing;
    }

    const legacyRows = await ctx.db
      .query("positions")
      .withIndex("by_audiobook", (q) => q.eq("audiobookId", canonicalId))
      .collect();
    return getLatestOwnedPosition(legacyRows, identity);
  },
});

export const update = mutation({
  args: {
    audiobookId: v.id("audiobooks"),
    chapterIndex: v.number(),
    positionMs: v.number(),
    clientUpdatedAt: v.number(),
  },
  returns: v.object({
    positionId: v.id("positions"),
    accepted: v.boolean(),
    serverPosition: v.union(
      v.object({
        chapterIndex: v.number(),
        positionMs: v.number(),
        updatedAt: v.number(),
      }),
      v.null(),
    ),
  }),
  handler: async (ctx, args) => {
    const identity = await resolveAuthIdentity(ctx);
    const userId = identity.userId;
    await checkRateLimit(ctx, "positionUpdate", userId);

    const book = await ctx.db.get(args.audiobookId);
    await assertOwnership(ctx, book);

    const canonicalId = await resolveCanonicalId(ctx, args.audiobookId, identity);

    let existing = await ctx.db
      .query("positions")
      .withIndex("by_user_and_audiobook", (q) =>
        q.eq("userId", userId).eq("audiobookId", canonicalId),
      )
      .unique();

    if (!existing) {
      const legacyRows = await ctx.db
        .query("positions")
        .withIndex("by_audiobook", (q) => q.eq("audiobookId", canonicalId))
        .collect();
      const latestLegacy = getLatestOwnedPosition(legacyRows, identity);
      if (latestLegacy) {
        existing = latestLegacy;
        await ctx.db.patch(existing._id, { userId });
        for (const row of legacyRows) {
          if (
            row._id !== existing._id &&
            matchesUserId(row.userId, identity)
          ) {
            await ctx.db.delete(row._id);
          }
        }
      }
    }

    if (existing && existing.updatedAt > args.clientUpdatedAt) {
      return {
        positionId: existing._id,
        accepted: false,
        serverPosition: {
          chapterIndex: existing.chapterIndex,
          positionMs: existing.positionMs,
          updatedAt: existing.updatedAt,
        },
      };
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        chapterIndex: args.chapterIndex,
        positionMs: args.positionMs,
        updatedAt: args.clientUpdatedAt,
      });
      return { positionId: existing._id, accepted: true, serverPosition: null };
    }

    const id = await ctx.db.insert("positions", {
      audiobookId: canonicalId,
      chapterIndex: args.chapterIndex,
      positionMs: args.positionMs,
      updatedAt: args.clientUpdatedAt,
      userId,
    });
    return { positionId: id, accepted: true, serverPosition: null };
  },
});
