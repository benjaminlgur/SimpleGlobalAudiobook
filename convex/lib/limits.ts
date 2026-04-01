import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";
import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { isHosted } from "./auth";

const RATE_LIMITS = {
  getOrCreate: { kind: "token bucket" as const, rate: 20, period: MINUTE, capacity: 20 },
  positionUpdate: { kind: "token bucket" as const, rate: 60, period: MINUTE, capacity: 60 },
  registerOnDevice: { kind: "token bucket" as const, rate: 10, period: MINUTE, capacity: 10 },
  linkUnlink: { kind: "token bucket" as const, rate: 20, period: MINUTE, capacity: 20 },
};

const rateLimiter = new RateLimiter(components.rateLimiter, RATE_LIMITS);

type RateLimitName = keyof typeof RATE_LIMITS;

export async function checkRateLimit(
  ctx: MutationCtx,
  name: RateLimitName,
  userId: string,
): Promise<void> {
  if (!isHosted()) return;
  const result = await rateLimiter.limit(ctx, name, { key: userId });
  if (!result.ok) {
    throw new ConvexError({
      code: "RATE_LIMITED" as const,
      message: "Too many requests. Please wait a moment and try again.",
      retryAfterMs: result.retryAfter,
    });
  }
}

const MAX_AUDIOBOOKS = 200;
const MAX_DEVICES = 10;

export async function checkAudiobookCap(
  ctx: { db: QueryCtx["db"] },
  userId: string,
): Promise<void> {
  if (!isHosted()) return;
  const count = await ctx.db
    .query("audiobooks")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  if (count.length >= MAX_AUDIOBOOKS) {
    throw new ConvexError({
      code: "LIMIT_REACHED" as const,
      message: `You've reached the maximum of ${MAX_AUDIOBOOKS} audiobooks. Remove some audiobooks or use your own Convex deployment for unlimited storage.`,
      limit: MAX_AUDIOBOOKS,
      resource: "audiobooks" as const,
    });
  }
}

export async function checkDeviceCap(
  ctx: { db: QueryCtx["db"] },
  userId: string,
  newDeviceId: string,
): Promise<void> {
  if (!isHosted()) return;
  const copies = await ctx.db
    .query("audiobookDeviceCopies")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const uniqueDevices = new Set(copies.map((d) => d.deviceId));
  if (uniqueDevices.size >= MAX_DEVICES && !uniqueDevices.has(newDeviceId)) {
    throw new ConvexError({
      code: "LIMIT_REACHED" as const,
      message: `You've reached the maximum of ${MAX_DEVICES} devices. Remove a device or use your own Convex deployment for unlimited devices.`,
      limit: MAX_DEVICES,
      resource: "devices" as const,
    });
  }
}
