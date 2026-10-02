# PropHub

PropHub is a React + Vite + Supabase app for Dubai real estate agencies that keep listing data in Bitrix24. The admin area creates clients and encrypted integration settings. The client app runs inside the agency's Bitrix portal iframe and reads live Bitrix data through Supabase Edge Functions.

## What is built

- React, Vite, TypeScript, React Router, Tailwind, TanStack Query/Table-ready UI, Framer Motion and Supabase.
- `/admin/login` and `/admin` for the super admin.
- `/{company-slug}`, `/{company-slug}/agents`, and `/{company-slug}/owners` for the iframe client app. Admin-created clients use a clean public slug like `sample-company` and a separate internal tenant ID like `sample_company_482`.
- Embed authorization flow using `ancestorOrigins` or `document.referrer`, then a 10-minute signed in-memory token.
- Supabase schema with RLS, `user_roles`, `has_role('admin')`, `clients`, `integration_settings`, `locations`, `developers`, and cache table.
- Edge Functions for admin clients, Bitrix test connection, public client info, token issuing, listings, agents, owners, and image proxy.
- Client dashboard settings for per-agency account name, company name, logo, theme, and accent color.
- AES-256-GCM helpers for secrets. Webhook URLs and portal credentials are never sent back to the browser in plain text.
- Phase 2 `PortalAdapter` placeholders for Property Finder and Bayut/Dubizzle without guessing partner APIs.

No fake listing data is seeded. If Bitrix is not connected or mappings are missing, the app shows clean empty/error states.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with your Supabase project URL and anon key.

## Supabase setup

1. Create a Supabase project and disable public sign-ups.
2. Run the migrations in `supabase/migrations` in order. Existing projects that already ran `0001` should also run `0002_public_slug.sql`.
3. Deploy functions from `supabase/functions`.
4. Add Edge Function secrets:

```bash
supabase secrets set APP_ORIGIN="https://your-app.example.com"
supabase secrets set ENCRYPTION_KEY="$(openssl rand -base64 32)"
supabase secrets set TOKEN_SIGNING_SECRET="$(openssl rand -hex 48)"
```

5. Create the first admin user in Supabase Auth, then insert their role:

```sql
insert into public.user_roles (user_id, role)
values ('YOUR_AUTH_USER_ID', 'admin');
```

## Bitrix requirements

The admin client creation form only needs the company name. PropHub generates the public URL slug and private internal client ID automatically. Add the HTTPS inbound webhook URL later from Integration Settings; it must end in:

```text
/rest/{userId}/{key}/
```

The Edge Functions call:

- `crm.item.fields` for Smart Process field discovery and enum dictionaries.
- `crm.item.list` with an explicit select allowlist.
- `crm.status.list` for actual stage names and semantics.
- `user.get` for agents and owners.

Listings are fetched live from Bitrix. They are not stored in Supabase in this phase.

## Security notes

- Supabase Auth is only for the super admin.
- Client app users do not log in to PropHub.
- The iframe check is a deterrent paired with a private internal `clientId`; public links use readable company slugs while signed tokens resolve back to the internal tenant ID.
- Image tags use the `image` Edge Function with the short-lived token in the query string because browsers cannot attach authorization headers to normal `<img>` requests.
- Private document fields must not be selected or shown. The normalizer only uses the mapped `Original images` file field.

## Useful commands

```bash
npm run dev
npm run build
```

## Conservative assumptions

- `APP_ORIGIN` is the public frontend origin used to generate the Bitrix left-menu link.
- The default Bitrix Smart Process `entityTypeId` is `1052`.
- The UI can be served as a static SPA while all sensitive work stays in Edge Functions.
