# Authentication and Farmer onboarding verification

## Automated backend checks

Run from `backend/`:

```bash
python manage.py test accounts --settings=config.test_settings
```

All 21 tests pass using an isolated in-memory SQLite database. They cover the four-role registration matrix, phone login, exact password preservation, inactive users, JWT refresh/revocation, manual Union creation, complete Farmer personal-details persistence, zero cattle, optional banking, case-insensitive duplicate Farmer IDs, rollback on profile failure, immediate pending-Farmer login with phone as initial password, and Society-scoped listing including accounts without profiles.

Django system checks and migration consistency checks pass. The new migration creates `accounts_farmerprofile`; it does not backfill demo details or change existing passwords.

## Frontend and UI checks

`node scripts/test-auth-integration.cjs` passes. It checks all four role mappings, exact login passwords, removal of demo fallback, validated session restoration, invalid session cleanup, logout token submission, Farmer mapping, registration/list requests, concurrent token refresh, refresh failure, and preservation of tokens on network errors.

TypeScript checks pass with the retired Node backend excluded from frontend compilation. Expo production web export succeeded. Chrome checks passed with all API requests intercepted by local fixtures: failed/successful login, every registration field, Society ownership, zero cattle, inline duplicate-ID errors, retained form values, and the Farmer list after page reload. No test Farmers were written to production.

Login, registration, and Society Farmers-list JSX and styles were compared with the existing forms and preserved. Screenshots of the rendered login, registration, and directory were inspected.

## Deployment status

The original `aavin` database and authentication schema were created and verified previously. Applying the new Farmer-profile migration from this environment timed out on two cloud connection attempts; it remains pending in the hosted database.

After copying the updated backend to your server, run from its `backend/` directory:

```bash
docker compose build backend
docker compose run --rm backend python manage.py migrate
docker compose up -d backend
```

Run the migration successfully before starting the updated backend. The deployed login response and `/api/v1/farmers` endpoint will not include the new functionality until that deployment is complete.
