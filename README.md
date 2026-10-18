# Aavin Smart Cattle Passport

Expo / React Native frontend with a Django REST Framework backend and cloud PostgreSQL.

## Current backend scope

This backend implements phone/password login, JWT access and refresh tokens, role-controlled registration, current-user lookup, logout, and Django Admin. There are exactly four roles:

| Account role | Who can register it | Parent account |
| --- | --- | --- |
| Farmer | Society | Registering Society |
| Society | BMC or Union | BMC |
| BMC | Union | Registering Union |
| Union | Manually through Django Admin or `createsuperuser` | None |

A BMC can have any number of Societies. When a Union registers a Society, it supplies the ID of an active BMC belonging to that Union. When a BMC registers a Society, the Society automatically belongs to that BMC. Registration requires authentication; there is no public signup or Union registration API.

The existing login and Society Farmer registration forms are connected to Django without layout changes. Society accounts use the existing Booth screens. The Society Farmers directory loads its own registered accounts from PostgreSQL. Cattle enrollment is persisted in PostgreSQL and restored on login and society directory refresh. Society farmer profile edits, cow name/milk-capacity edits, and farmer KYC verification also persist through the API. Farmer milk, vendor batches, attendance, dispatch receipts, and the linked BMC inbox also use Django. Payments, clinical records, cattle verification, and AI features retain their local/demo workflows. The previous Node/MySQL code and QR portal are preserved under `legacy/`.

## Backend setup

Python 3.12 or later is recommended. Run from the project root:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
```

On Windows, use `python` and `backend\.venv\Scripts\python.exe` instead.

Copy `backend/.env.example` to `backend/.env` if the file does not already exist. Set a random `DJANGO_SECRET_KEY` and the database password. The local `.env` is ignored by Git.

The configured PostgreSQL connection uses host `13.232.41.40`, port `5432`, username `nivas`, database `aavin`, and `sslmode=require`. `aavin` is separate from the existing `college` database. Django migrations create tables inside the existing database; they do not create or drop databases.

```bash
backend/.venv/bin/python backend/manage.py migrate
backend/.venv/bin/python backend/manage.py createsuperuser
backend/.venv/bin/python backend/manage.py runserver 0.0.0.0:4000
```

`createsuperuser` prompts for a phone number, full name, and password, and creates a Union administrator. Visit `http://localhost:4000/admin/` to manage accounts. Set `DJANGO_ALLOWED_HOSTS` to include your machine's LAN IP before connecting from another device. Set the allowed browser origins through `FRONTEND_ORIGINS`.

The npm wrappers also work after installing the Python dependencies:

```bash
npm run backend
npm run db:init
npm --prefix backend test
```

`npm start` launches Django and the existing Expo frontend together. Install frontend dependencies with `npm install` first. Set `AAVIN_PYTHON` if using a Python environment outside `backend/.venv`. Cloud database reset is disabled.

## Ubuntu server updates with Docker Compose

If `git pull origin backend` reports that untracked `backend/milk_collections/`
files would be overwritten, plain `git stash` did not save those untracked files.
Save them in a second stash before retrying the pull. From the repository root:

```bash
git stash push --include-untracked -m "server untracked files before backend update"
git pull --ff-only origin backend
git stash list
```

The earlier stash containing tracked edits is still saved. Leave both stashes
saved during deployment; popping the untracked-files stash immediately would
conflict with the files now supplied by the repository. Inspect any server-only
changes with `git stash show --include-untracked -p 'stash@{0}'` and
`git stash show -p 'stash@{1}'` before manually restoring changes you still need.
The indices assume these are the two most recent stashes; confirm with `git stash list`.
The ignored `backend/.env` remains in place.

Ensure `backend/.env` contains the production secret, database credentials,
`DJANGO_DEBUG=false`, and `DJANGO_ALLOWED_HOSTS` including the server's public
IP or domain. Then run from the repository root:

```bash
docker compose -f backend/docker-compose.yml config --quiet
docker compose -f backend/docker-compose.yml build backend
docker compose -f backend/docker-compose.yml run --rm backend python manage.py check
docker compose -f backend/docker-compose.yml run --rm backend python manage.py migrate --noinput
docker compose -f backend/docker-compose.yml up -d backend
docker compose -f backend/docker-compose.yml ps
docker compose -f backend/docker-compose.yml logs --tail=100 backend
```

Compose reads `backend/.env`, builds from `backend/`, and exposes the API on
host port **8002** (container port **8000**). Database migrations must succeed
before starting the updated service. This setup connects to the configured
external PostgreSQL database. See the container logs if startup fails.

If PostgreSQL runs on the Ubuntu Docker host, set `DATABASE_HOST=host.docker.internal`
in `backend/.env`. Compose maps this hostname to Docker's host gateway on Linux.
PostgreSQL must listen on an address reachable from the Docker network and allow
the container's connection in `pg_hba.conf`. For a remote PostgreSQL server, set
`DATABASE_HOST` to that server's reachable address instead.

## Authentication API

All paths below use `/api/v1/auth` and do not require trailing slashes.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/login` | Phone/password login |
| POST | `/register` | Authenticated, role-controlled account creation |
| POST | `/refresh` | Exchange a refresh token for an access token |
| GET | `/me` | Current account |
| POST | `/logout` | Revoke a supplied refresh token |

Login body:

```json
{"phone":"9842000001","password":"your-password"}
```

Login returns `data.accessToken`, `data.refreshToken`, and `data.user`. Protected endpoints require `Authorization: Bearer <accessToken>`. The old frontend field `usernameOrPhone` is accepted only when its value is a phone number.

Registration body:

```json
{"phone":"9842000002","fullName":"Society Manager","password":"a-strong-password","role":"society"}
```

A Union creating a Society must additionally supply `parentId` containing the BMC account UUID. For other allowed registrations, the authenticated creator is the parent; clients cannot select another parent.

Refresh and logout bodies use `{"refreshToken":"..."}`. Access tokens expire after 30 minutes and refresh tokens after seven days. Logout revokes the supplied refresh token; issued access tokens remain valid until expiry. A logout request without a refresh token does not revoke one.

`GET /health` checks the service; `GET /ready` checks the PostgreSQL connection.

## Validation

```bash
backend/.venv/bin/python backend/manage.py check
backend/.venv/bin/python backend/manage.py test --settings=config.test_settings
```

The automated tests use an isolated in-memory SQLite database, never the cloud database. They cover all role creation permissions, phone login, inactive users, password hashing and validation, duplicate phones, parent restrictions, more than 15 Societies under a BMC, JWT refresh and revocation, and manual Union creation through the Admin form.

See [domain models and endpoint ownership](docs/domain-models.md), [API details](docs/api.md), [architecture](docs/architecture.md), and [database notes](database/README.md).

## Bruno API collection

Open `bruno/Aavin API` as a collection in Bruno and select the Local environment. See [Bruno setup and request order](bruno/Aavin%20API/README.md).

### Integrated Farmer onboarding

The Society registration form persists Farmer personal details in PostgreSQL. The initial Farmer password is the phone number when the registration omits an explicit password, and pending Farmers can log in immediately. Existing account-only registrations and accounts without profiles remain supported.

Before deploying the updated API, run `python manage.py migrate` in the backend environment. Rebuild/restart the hosted Django container to expose the extended registration and `GET /api/v1/farmers`; frontend code alone cannot update the hosted server.

The default frontend API is `https://aavin.todayworld.in/api/v1`. Set `EXPO_PUBLIC_API_URL` or use the existing Server Settings to override it. Run isolated frontend behaviour checks with `node scripts/test-auth-integration.cjs` and backend tests with `python manage.py test accounts --settings=config.test_settings` from `backend/`.

### Cattle enrollment

Both Farmer enrollment forms submit a `cows` array with each cow's `pashuAadhaar` (12 digits), `breed`, `milkCapacity` (positive litres/day, up to two decimal places), and optional `name`. `accounts_cow` stores one row per cow; `farmer_id` references the typed Farmer record in `farmers_farmer`, which shares the authentication account UUID. Pashu Aadhaar tags are globally unique. The backend saves the account, profile, and cows in one transaction, and derives the profile cattle count from the supplied array.

Registration, login, `/api/v1/auth/me`, and the Society-scoped `/api/v1/farmers` list return saved cows with their UUIDs and farmer IDs. Account-only registrations can still omit `cows`. Previously local cattle are preserved on the device but not automatically imported; clinical data remains local.

Apply all migrations before starting the updated API:

```bash
backend/.venv/bin/python backend/manage.py migrate
```

For the hosted Docker service, deploy the updated backend image and run `python manage.py migrate` with its database environment before serving traffic. The frontend requires the updated API to persist cattle.

Society farmer edits and KYC use `PATCH /api/v1/farmers/<farmer UUID>`. It accepts partial account/profile fields, updates to existing cow IDs, and a `newCows` array for adding cattle to an existing Farmer. The backend restricts changes to the Society's own Farmers and each Farmer's own cows, saves atomically, and returns the refreshed account/cattle. Farmer assignment, cow RFID and breed are fixed in this edit flow. Counts derive from saved cattle. Existing accounts without a profile must first save Farmer ID, address, and village before KYC. Verify the actual Society screen controls with `node scripts/test-society-farmers.cjs`.

### Phone cannot connect to Expo CLI

Keep the Expo terminal running while using the app. Scan the QR code generated by Expo after startup, rather than a saved QR code. If LAN access is blocked by Windows Firewall, WSL networking, or the Wi-Fi network, run:

```bash
npm run mobile
```

This starts Expo Go with a tunnel and clears Metro's cache, using the configured hosted API. Expo may prompt to install its tunnel dependency on first use. Close and reopen the project in Expo Go using the new QR code. To start the local backend alongside the tunnel, use `npm start -- --tunnel`. Local backend failures no longer stop the Expo server.
