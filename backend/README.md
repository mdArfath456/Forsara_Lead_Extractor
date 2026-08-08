# Forsara Lead Extractor — Backend

## Setup
```bash
cp .env.example .env      # fill in Mongo URI, session secret, API keys
npm install
npm run seed:admin -- <username> <password>   # creates the admin account in MongoDB
npm run dev                                    # nodemon-style watch via node --watch
```

> Note: In local development, use the frontend Vite dev server and its `/api` proxy (`frontend/npm run dev`). Direct cross-origin requests from `localhost:5173` to `localhost:5000` may not preserve session cookies reliably.

## Admin account
The single admin login is stored in MongoDB (`AdminUser` collection), not in
`.env` — matches the "seeded admin, no user management system" requirement.

Create or rotate it any time with:
```bash
npm run seed:admin -- myusername mypassword
```
This hashes the password with bcrypt before writing to the DB — the
plaintext is never stored.

## Architecture notes
- **Discovery order**: Google Places (New) is primary, Foursquare's free tier
  is the fallback if Google Places fails, hits a rate limit, or isn't
  configured — see `ProviderRegistry.js`. Both need an API key in `.env`.
- **Provider adapter layer**: `src/services/leadProviders/`. Add a new discovery
  or enrichment source by creating a new provider class implementing
  `LeadProvider`, registering it in `ProviderRegistry.js`, and adding a case
  in `normalizeLead.js`. Controllers never import providers directly.
- **OverpassProvider.js (OSM, free, no key) is still in the codebase** but not
  in the active chain — add it back to `ProviderRegistry.js`'s
  `discoveryProviders` array as a no-cost fallback if you want one later.
- **Soft delete everywhere**: use `.notDeleted()` query helper on `Lead`,
  never a raw `find({})`.
- **Redis is optional at runtime**: cache failures degrade to "always hit the
  provider" rather than crashing — see `config/redis.js`.
- **XLSX export is stubbed** in `export.controller.js` (returns 501) — wire up
  `exceljs` or `xlsx` (SheetJS) when you reach that phase; CSV/JSON work now.

## Not yet built (next phases)
- Input validators (zod schemas per route) — currently controllers trust
  request bodies; add validation middleware before production use.
- Fuzzy dedupe (currently exact-match on name+city+postal only).
- Frontend (Phase 2).
- Docker/CI (Phase 9).
