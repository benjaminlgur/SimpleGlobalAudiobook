# Production Notes

These notes cover the hosted production setup for the Convex deployment
`effervescent-squid`.

## Hosted Production Deployment

Use `effervescent-squid` as the shared hosted Convex project for Google sign-in
users in production.

At the time these notes were written, the deployed production URLs were:

- `https://effervescent-squid-842.convex.cloud`
- `https://effervescent-squid-842.convex.site`

Set the production hosted app URLs to:

- `VITE_HOSTED_CONVEX_URL=https://effervescent-squid-842.convex.cloud`
- `EXPO_PUBLIC_HOSTED_CONVEX_URL=https://effervescent-squid-842.convex.cloud`

## Convex Production Env Vars

In the Convex dashboard for the production hosted deployment, set:

```env
REQUIRE_AUTH=true
AUTH_GOOGLE_ID=<production google oauth client id>
AUTH_GOOGLE_SECRET=<production google oauth client secret>
JWT_PRIVATE_KEY=<generated private key>
JWKS=<matching jwks json>
SITE_URL=http://tauri.localhost
```

### Why `SITE_URL` is `http://tauri.localhost`

For the current app architecture:

- Desktop uses the Tauri webview and needs Convex Auth to redirect back into the
  app at `http://tauri.localhost`.
- Mobile uses a deep link redirect such as
  `simple-syncing-audiobook://...`, which is explicitly allowed in
  `convex/auth.ts`.

That means one hosted production Convex deployment can support both:

- users running the desktop app downloaded from GitHub releases
- users running the Android app installed from the Play Store

Do not set `SITE_URL` to the Convex cloud URL or the Play Store listing URL.

## Google OAuth Production Setup

For the production Google OAuth client, add this Authorized redirect URI:

```text
https://effervescent-squid-842.convex.site/api/auth/callback/google
```

You do not need to add any of these as Google redirect URIs:

- `http://tauri.localhost`
- the Play Store URL
- the mobile deep link URL

Google redirects to the Convex callback URL first. Convex then redirects back to
the desktop app or mobile app.

## Production Checklist

1. Set the Convex env vars on the production hosted deployment.
2. Set the production app env vars to point at
   `https://effervescent-squid-842.convex.cloud`.
3. Set the GitHub Actions repository variable `HOSTED_CONVEX_URL` to
   `https://effervescent-squid-842.convex.cloud` so release builds include the
   Google sign-in option on desktop and mobile.
4. Set the GitHub Actions secret `CONVEX_DEPLOY_KEY_PROD` to a production
   deploy key for the hosted Convex project.
5. Add the Google OAuth redirect URI for the production Convex site.
6. Build and ship the desktop app with
   `VITE_HOSTED_CONVEX_URL=https://effervescent-squid-842.convex.cloud`.
7. Build and ship the mobile app with
   `EXPO_PUBLIC_HOSTED_CONVEX_URL=https://effervescent-squid-842.convex.cloud`.

## GitHub Release Builds

The release workflow reads the production hosted URL from the GitHub Actions
repository variable:

```text
HOSTED_CONVEX_URL=https://effervescent-squid-842.convex.cloud
```

Without that variable, release desktop builds will hide the Google sign-in
button because `VITE_HOSTED_CONVEX_URL` is missing at build time.

The release workflow also deploys the Convex backend before building app
artifacts. Store the production deploy key in this GitHub Actions secret:

```text
CONVEX_DEPLOY_KEY_PROD=<production deploy key>
```

## Key Generation Reminder

`JWT_PRIVATE_KEY` and `JWKS` must be a matching pair. Generate them once for the
production hosted deployment and store both in the Convex production env vars.

## Future Web App Note

If a browser-based web app is added later, `SITE_URL=http://tauri.localhost`
will not be enough by itself. A real web app would need its own allowed web URL
such as `https://your-site.com`, and `convex/auth.ts` should be updated to allow
that redirect target too.
