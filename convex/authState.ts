import { v } from "convex/values";
import { query } from "./_generated/server";

export const viewerScope = query({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const [userId] = identity.subject.split("|");
    if (!userId) {
      throw new Error("Unable to determine user scope");
    }

    return userId;
  },
});
