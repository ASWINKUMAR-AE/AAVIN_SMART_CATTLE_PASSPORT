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

The existing login and Society Farmer registration forms are connected to Django without layout changes. Society accounts use the existing Booth screens. The Society Farmers directory loads its own registered accounts from PostgreSQL. Milk, cattle, payments, editing, verification, and AI features remain local/demo workflows outside this integration. The previous Node/MySQL code and QR portal are preserved under `legacy/`.

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

The 21 automated tests use an isolated in-memory SQLite database, never the cloud database. They cover all role creation permissions, phone login, inactive users, password hashing and validation, duplicate phones, parent restrictions, more than 15 Societies under a BMC, JWT refresh and revocation, and manual Union creation through the Admin form.

See [API details](docs/api.md), [architecture](docs/architecture.md), and [database notes](database/README.md).

## Bruno API collection

Open `bruno/Aavin API` as a collection in Bruno and select the Local environment. See [Bruno setup and request order](bruno/Aavin%20API/README.md).

### Integrated Farmer onboarding

The Society registration form persists Farmer personal details in PostgreSQL. The initial Farmer password is the phone number when the registration omits an explicit password, and pending Farmers can log in immediately. Existing account-only registrations and accounts without profiles remain supported.

Before deploying the updated API, run `python manage.py migrate` in the backend environment. Rebuild/restart the hosted Django container to expose the extended registration and `GET /api/v1/farmers`; frontend code alone cannot update the hosted server.

The default frontend API is `https://aavin.todayworld.in/api/v1`. Set `EXPO_PUBLIC_API_URL` or use the existing Server Settings to override it. Run isolated frontend behaviour checks with `node scripts/test-auth-integration.cjs` and backend tests with `python manage.py test accounts --settings=config.test_settings` from `backend/`.
