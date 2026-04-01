import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    async redirect({ redirectTo }) {
      if (redirectTo.startsWith("/")) {
        return redirectTo;
      }

      const siteUrl = process.env.SITE_URL;
      if (siteUrl && redirectTo.startsWith(siteUrl)) {
        return redirectTo;
      }

      if (redirectTo.startsWith("simple-syncing-audiobook://")) {
        return redirectTo;
      }

      return siteUrl ?? "/";
    },
  },
});
