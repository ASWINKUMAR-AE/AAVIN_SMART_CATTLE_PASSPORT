# Aavin API — Bruno collection

Open this directory as a collection in Bruno. It contains 13 requests covering every current JSON API endpoint, four role-specific logins, and every permitted registration path.

## Open in Bruno on Windows

1. Choose **Open Collection** and select `D:\AAVIN_SMART_CATTLE_PASSPORT\bruno\Aavin API` (the directory containing `bruno.json`).
2. Select the **Local** environment.
3. Open its variables and enter your actual Union phone/password, plus the phone numbers and strong passwords you want to use for the BMC, Society, and Farmer accounts.
4. Start Django on port 4000 and send **01 Service → 01 Health**.

`baseUrl` defaults to `http://localhost:4000`. Change it if Django runs at another address. Do not use the PostgreSQL host as the API address unless Django is actually running there.

`Local.bru` is ignored by Git. `Example.bru` is the shareable blank template. If Local is missing after cloning the repository, duplicate Example as Local before entering credentials. Example phone numbers are placeholders, not pre-created accounts.

## First-time request order

Create the Union account manually with `python3 manage.py createsuperuser` in the backend environment, then run these requests individually:

1. **02 Login → 01 Login Union**
2. **03 Registration → 01 Union creates BMC**
3. **02 Login → 02 Login BMC**
4. **03 Registration → 02 BMC creates Society**
5. **02 Login → 03 Login Society**
6. **03 Registration → 03 Society creates Farmer**
7. **02 Login → 04 Login Farmer**
8. **04 Session → 01 Current user**
9. **04 Session → 02 Refresh access token**
10. **04 Session → 03 Logout**

Registration saves the created account IDs automatically. Each login saves a token for that role, so registration always uses the appropriate creator's token. Session requests use whichever account logged in most recently. Tokens are held in runtime variables using `bru.setVar`; log in again after restarting Bruno.

To create a Society directly as Union, use **03 Registration → 04 Union creates another Society**. Enter `additionalSocietyPhone` and `additionalSocietyPassword`, and either create/log in to the BMC first to capture its UUID or set `bmcId` to an existing BMC UUID belonging to the Union. The Union must have a valid login token.

Send requests individually in this order, rather than running the whole collection: registration creates real accounts, and repeating it with the same phone number returns a validation error.

## Endpoints

| Method | Path | Requests |
| --- | --- | --- |
| GET | `/health` | Service health |
| GET | `/ready` | PostgreSQL readiness |
| POST | `/api/v1/auth/login` | Union, BMC, Society, Farmer examples |
| POST | `/api/v1/auth/register` | Four allowed creator/account combinations |
| GET | `/api/v1/auth/me` | Active user |
| POST | `/api/v1/auth/refresh` | Refresh active access token |
| POST | `/api/v1/auth/logout` | Revoke active refresh token |

Django Admin is a browser interface at `http://localhost:4000/admin/`, not a JSON API. Union creation is manual and has no registration API. All request files include sample JSON where applicable, expected status checks, and usage notes.
