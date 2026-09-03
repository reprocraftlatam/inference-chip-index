# Cloudflare deployment

The project targets Cloudflare Workers through OpenNext.

```bash
npm ci
npm run verify
npx opennextjs-cloudflare build
npx wrangler deploy
```

Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin. Configure live payment values only as encrypted Worker secrets. Do not put private values in `wrangler.jsonc`, `.env.example`, client components, source maps or build logs.

After deployment verify `/`, `/leaderboard`, `/methodology`, `/api`, `/updates`, `/api/agent/health`, entrypoint discovery, agent card and OpenAPI. Invoke both free routes. Invoke each paid route without payment and require a non-200 fail-closed response. Keep the generated manifest hash identical to the reviewed local build.
