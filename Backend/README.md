# Backend API

TypeScript + Node.js + Express backend.

Expected responsibilities:

- Verify Supabase Auth JWTs.
- Proxy OpenAI requests.
- Integrate cosmetic and health-food public APIs.
- Normalize product and ingredient data.
- Store and load user data from Supabase PostgreSQL.
- Run analysis rules and return evidence-based explanations.

## Important Files

```text
src/                  Express source code
supabase/migrations/  PostgreSQL schema migrations
supabase/seed/        Local/dev seed data
docs/                 Backend-specific docs if needed
```

## Setup

```bash
npm install
```

Create `Backend/.env` from `Backend/.env.example` and fill only local values.
Do not commit `.env`.

## Scripts

```bash
npm run dev        # Start local development server
npm run build      # Compile TypeScript to dist/
npm run typecheck  # Type-check without emitting files
npm run check:supabase # Verify Supabase connection with local env
npm run setup:supabase # Create required Supabase resources when possible
npm run check:external-apis # Verify MFDS ingredient API response
npm test           # Run tests
```

The local server exposes:

```text
GET /api/health
GET /api/health/supabase
```
