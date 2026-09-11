# Hualas

Full-stack application for Club Hualas built with Next.js 14, Prisma and PostgreSQL.

## Development

1. Copy `.env.example` to `.env` and set the values (database connection, NextAuth secret, canonical `APP_BASE_URL`, Google OAuth client credentials if using Google sign-in, Mercadopago token, Pinata JWT for IPFS uploads, `BLOB_READ_WRITE_TOKEN` for private file uploads, and the `RESEND_*` variables for notification email delivery).
2. Install dependencies with `pnpm install`.
3. Generate the Prisma client: `pnpm prisma:generate`.
4. Start the dev server: `pnpm dev`.
5. Run checks with `pnpm format:check`, `pnpm lint`, `pnpm test`, and `pnpm build`.

`pnpm dev` and `pnpm build` run `scripts/copy-pdf-worker.mjs` before Next.js so
the documentary PDF viewer has the worker asset it expects.

The public visual story page `/habitantes-de-la-tierra` serves the documentary
PDF from `public/documentos/pequenos-habitantes-de-la-tierra.pdf`; it should not
depend on Google Drive at runtime.

## Native Apps

- iPhone: native SwiftUI app in `iphone/HualasMobile`; setup is in `iphone/README.md`.
- Android: native Kotlin/Compose app in `android`; setup is in `android/README.md`.
- Both native apps talk to the backend through `/api/mobile/*` bearer-token endpoints.

## Agent-Facing Docs

When adding or changing functionality, update the docs that future agents read
first: `PROJECT_CONTEXT.md`, `ROUTE_MAP.md`, `.agent-registry.yaml`, and any
relevant platform README/API contract. New work should not be discoverable only
by searching the source tree.

Before finishing a task, agents should run `pnpm format:check` and attempt
`pnpm build`. If a command is blocked by local environment requirements, note
the exact command and reason in the final response.

## Deployment

- Git repository: https://github.com/escuelademontana/Hualas (local `origin`).
- Vercel project: https://vercel.com/hualas/hualas (team `hualas`, Next.js preset, root `./`), connected to `escuelademontana/Hualas`.
- Supabase project: `hualas` (`vcdcqfpejlrhvwcytyyg`). It contains the complete application database with 46 public tables. Local `DATABASE_URL` and `SUPA_DATABASE_URL` use the Supavisor session pooler for migrations. Production `DATABASE_URL` uses the Supavisor transaction pooler with `pgbouncer=true` and `connection_limit=1` to avoid serverless connection exhaustion. `SUPABASE_DB_PASSWORD` is kept as a local helper; Vercel receives the complete pooler URL through `DATABASE_URL`.
- Vercel Blob store: `hualas-media`, connected to the `hualas` project for Production and Preview with a generated `BLOB_READ_WRITE_TOKEN`. The activity assets migrated from the previous Blob store live in `public/activity-images/`; their database values use `/activity-images/...` and the activity image API routes serve them with immutable caching. New uploads continue to use Vercel Blob.
- Production deployment: https://clubhualas.com.ar/ (Vercel alias https://hualas-iota.vercel.app/), built from `main` and connected to the GitHub repository. The Vercel production environment has the Supabase `DATABASE_URL`, `NEXTAUTH_SECRET`, and Google OAuth credentials configured.
- The custom domain `clubhualas.com.ar` is assigned to Production in Vercel and shows `Configuración válida` with DNS/SSL active.
- The production build generates Prisma Client and compiles Next.js.
- Apply pending Prisma migrations separately with `pnpm db:migrate:deploy` before or after deploy, using the intended target database.
- Make sure `DATABASE_URL` points to the target database when running migrations.
- Configure `BLOB_READ_WRITE_TOKEN` in Vercel for private Blob uploads such as profile photos, receipts, activity media, news media, and professor invoices.
- Configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_FROM_NAME` in Vercel to deliver the existing in-app notifications by email. The sender domain must be verified in Resend before production delivery.
- File uploads are validated server-side by magic bytes before private Blob writes; spoofed image/SVG content is rejected even if the browser reports an image MIME type.
- If a deployment is already serving an older schema, run `pnpm db:migrate:deploy` once against that database and redeploy.

## Google OAuth on Vercel

- Google Cloud project: `Hualas Club` (`hualas-club`), with an external OAuth consent screen published in production. The app branding uses `https://clubhualas.com.ar/` and `https://clubhualas.com.ar/privacy-policy`; Google verification may still be required if additional sensitive/restricted scopes or branding assets are added.
- The production OAuth client authorizes `https://hualas-iota.vercel.app/api/auth/callback/google` and `https://clubhualas.com.ar/api/auth/callback/google`; both callbacks are registered and the custom domain is validated in Vercel.
- Keep `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local` for local work and in Vercel Production/Preview environment variables. Never commit either value.
- `NEXTAUTH_URL` in `.env.example` is for local development only: `http://localhost:3000`.
- In Vercel Production, `NEXTAUTH_URL` and `APP_BASE_URL` are set to `https://clubhualas.com.ar`; Preview keeps its own host inference, so preview callbacks must be registered separately if Google sign-in is enabled there.
- In Google Cloud, the OAuth client must authorize the exact callback URL used by NextAuth:
  - local: `http://localhost:3000/api/auth/callback/google`
  - production: `https://clubhualas.com.ar/api/auth/callback/google`
- Preview or staging deployments need their own authorized callback URL. If Google OAuth is not configured for that hostname, disable Google sign-in there and use credentials auth for testing.
- If the Vercel domain, `NEXTAUTH_URL`, and Google authorized redirect URI do not match exactly, Google sign-in can fail with `OAUTH_CALLBACK_ERROR` / `invalid_grant`.

## Mercado Pago environments

- `MP_ENVIRONMENT=testing` usa `MP_PUBLIC_KEY` y `MP_ACCESS_TOKEN`.
- `MP_ENVIRONMENT=production` usa `MERCADOPAGO_PUBLIC_KEY` y `MERCADOPAGO_ACCESS_TOKEN`.
- Webhooks: `MP_WEBHOOK_SECRET` para testing y `MERCADOPAGO_WEBHOOK_SECRET` para production. Usar la clave secreta generada en Mercado Pago > Tus integraciones > Webhooks.
- `APP_BASE_URL` debe apuntar al origen canónico público de la app, por ejemplo `https://hualas.vercel.app`. Mercado Pago usa este valor para construir URLs en vez de confiar en el `Host` del request.
- `MP_RETURN_URL_BASE` permite separar la base de retorno si hace falta; `MP_NOTIFICATION_URL` permite fijar un webhook absoluto. Si no se configuran, se usa `APP_BASE_URL`.

### Opciones de Checkout Pro

- `MP_AUTO_RETURN`: `approved` (default) o `all`.
- `MP_BINARY_MODE`: `true/false` para aceptar/rechazar sin pendientes.
- `MP_MAX_INSTALLMENTS`: cuotas máximas ofrecidas.
- `MP_PREFERENCE_EXPIRES_MINUTES`: vencimiento de la preferencia.
- `MP_EXCLUDED_PAYMENT_METHODS`: IDs separados por coma.
- `MP_EXCLUDED_PAYMENT_TYPES`: IDs separados por coma.
- En Production, `MP_RETURN_URL_BASE` apunta a `https://clubhualas.com.ar` y `MP_NOTIFICATION_URL` a `https://clubhualas.com.ar/api/mercadopago/notifications`.

## Push notifications

Las push web usan PushAlert.

Agregá al `.env.local`:

- `PUSHALERT_REST_API_KEY`: clave REST para enviar notificaciones desde el servidor.

La app carga el script público de PushAlert en el layout y guarda el `subscriber_id` de cada navegador para poder enviarle notificaciones segmentadas. Las notificaciones in-app siguen funcionando aunque falte esta variable, pero el envío push no.
