# Run in Ubuntu WSL 2

This checkout is available in Ubuntu at `/mnt/d/AAVIN_SMART_CATTLE_PASSPORT`.
Use Linux Node.js/npm for this checkout; dependencies include Linux native modules.

## Start

From PowerShell:

```powershell
wsl -d Ubuntu
```

Then in Ubuntu:

```bash
cd /mnt/d/AAVIN_SMART_CATTLE_PASSPORT
sudo service mysql start
npm start
```

Open http://localhost:4000/qr-portal on Windows. Expo runs on port 8081.
To launch the browser version separately, run `npm run web` in another Ubuntu terminal.

The backend reads `backend/.env`, which contains the local database credentials
and generated JWT secrets. AI is disabled until a provider is configured.
MySQL runs inside Ubuntu; XAMPP is not required.

## Verify or reinstall dependencies

```bash
npm ci
npm --prefix backend ci
npm --prefix backend run build
npm --prefix backend test
```

The backend automatically imports the schema and demo data when the database
is empty. Do not run `db:init` against an already populated database: its schema
is not idempotent. `db:reset` deletes existing application data.

Demo login: `admin_aavin` / `Password@123`.

## Physical phones

Run `npm run mobile` for Expo Go through the approved internet tunnel. This
uses two Metro workers and keeps the cache between launches. Keep this terminal
open and scan its new QR code; the tunnel URL can change after restarting.

If a cache reset is needed once, use `npm run mobile -- --clear`.


Windows localhost access and phone access are different. WSL 2 NAT addresses
are usually unreachable from phones. For Expo Go on a phone, use a reachable
network configuration (such as WSL mirrored networking and matching firewall
rules), or Expo tunnel mode. An Expo tunnel exposes Metro only; the backend
must also be reachable and set in the app's Server Settings.
