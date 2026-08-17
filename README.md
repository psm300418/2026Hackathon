# Personal Skin Data Prototype

Hackathon prototype for a personal skin data app.

The project is kept as a monorepo during the hackathon so Android, backend,
database schema, and shared API notes can evolve together.

## Structure

```text
Android/   Kotlin + Jetpack Compose app
Backend/   TypeScript + Node.js + Express API server
docs/      Shared API, architecture, and data model notes
```

## Direction

- Android handles user flows, local UI state, photo capture/upload flow, and API calls.
- Backend owns OpenAI calls, external cosmetic/health-food API integrations, Supabase access, and analysis rules.
- Supabase PostgreSQL stores user records, products, ingredients, usage logs, skin logs, and analysis results.
- Supabase Storage should be used for user-uploaded skin photos.

## Repo Strategy

Use one GitHub repository for the hackathon. If the project grows, `Android/`
and `Backend/` can be split into separate repositories later because their
boundaries are already explicit.

## Collaboration

Use GitHub Flow with short-lived feature branches and Pull Requests.

- Branch from `main`.
- Open a PR for every change.
- Prefer `Squash and merge`.
- Never commit `.env` files or real API keys.

See `docs/git-workflow.md` for details.
See `docs/conventions.md` for code conventions and commit message rules.

## Development

Backend:

```bash
cd Backend
npm install
npm run dev
```

Android:

```bash
cd Android
./gradlew :app:assembleDebug
```

On Windows:

```powershell
cd Android
.\gradlew.bat :app:assembleDebug
```
