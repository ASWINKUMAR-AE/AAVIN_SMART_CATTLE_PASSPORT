# Aavin Smart Cattle Passport — Milk Safety Twin

Full-stack dairy management ecosystem for the Aavin milk collection network in Madurai District, Tamil Nadu, India.

**Core End-to-End Workflow:**
**Cow identification → Health check → Milk safety decision → Milk collection & analysis → Farmer payment → Aavin administration**

---

## Key Features

- 🐄 **Digital Cattle Passport & Opaque QR Tokens:** Permanent history of cattle health, breeding, milk yields, and clinical treatments.
- 🧪 **Deterministic Milk Safety Twin Engine:** Evaluates animal health, veterinary withdrawal restrictions, and analyzer test readings (Fat %, SNF %, Temp, Adulteration) to generate CLEAR, REVIEW, or HOLD decisions.
- 🩺 **Veterinary Clinical & Withdrawal Management:** Prescribe treatments with automated withdrawal period calculation and live quarantine locking.
- 🥛 **Collection Centre Intake:** Analyzer measurements entry, instant safety decision reveal animation, and digital receipt generation.
- 💰 **Transparent 15-Day Fortnight Billing:** Quality incentives, automatic rate calculation, and cycle payment approvals.
- 🚛 **Milk Transport Logistics:** Batch assembly, chilled tanker temperature logs, custody tracking, and discrepancy reporting.
- 🤖 **Backend AI Advisor (OpenRouter & Own API):** Grounded advisory in Tamil (தமிழ்) and English. AI fallback disabled by default and never silent. Safety decisions operate 100% independently of AI.
- 🎨 **Native iOS Design & Motion:** Grouped inset cards, Cupertino typography scale, smooth Reanimated spring feedback, skeleton shimmer, and dark mode.

---

## Technology Stack

- **Mobile Frontend:** React Native 0.81.4, Expo SDK 54, Expo Router v6, TypeScript strict, Expo Camera, Expo Haptics, Reanimated, Svg Charts.
- **Backend Server:** Node.js Express TypeScript, MySQL (`mysql2` pool with prepared statements), JWT access & refresh tokens, Socket.IO, Helmet, Rate Limiting, Zod validation.
- **Database:** MySQL via XAMPP/phpMyAdmin (`aavin_milkflow`), InnoDB, foreign keys, DECIMAL measurements.

---

## 🚀 Single Command to Run Full Ecosystem (Website + Backend + Mobile App)

```bash
npm start
```
*(or `npm run dev`)*

> ✨ **What `npm start` does in one single command:**
> 1. Starts the **Node.js Express TypeScript Backend & WebSocket Server** on port 4000.
> 2. Hosts the **Aavin Cattle Digital Passport & Live QR Code Website** at `http://localhost:4000/qr-portal`.
> 3. Automatically opens the **Web QR Portal in your default browser**.
> 4. Launches the **Expo Mobile App Metro Bundler** on port 8081 with an in-terminal QR code for instant scanning via the **Expo Go** mobile app.

---

## 🌐 Endpoints & URLs Summary

- **🖥️ Web QR Code Portal (Desktop Browser):** `http://localhost:4000/qr-portal` (or `http://localhost:4000`)
- **📱 Expo Go Mobile App:** `exp://192.168.0.12:8081` (Auto-detected LAN IP)
- **💻 Metro Web Dev Server:** `http://localhost:8081`
- **🚀 Backend REST API & WebSocket:** `http://localhost:4000/api/v1`

---

## Quick Start Guide

### 1. Database (XAMPP / phpMyAdmin)
1. Start **Apache** and **MySQL** in XAMPP.
2. In `http://localhost/phpmyadmin/`, import `database/schema.sql`.
3. Select database `aavin_milkflow` and import `database/seed.sql`.

### 2. Run Full Project (Single Command)
```bash
npm start
```
- **Displaying QR Code in Terminal:** The Expo dev server will print the QR code in your terminal log under the `[EXPO]` stream.
- **Viewing QR in Browser:** You can also open the Metro Bundler web interface in your browser (usually `http://localhost:8081`) to see a high-resolution QR code.
- **Scanning:** Open **Expo Go** on Android or Camera on iOS, scan the QR code to load the app.
- **Tunnel Mode (If on mobile hotspot/restricted Wi-Fi):** `npx expo start --tunnel`

### 3. Individual Component Commands (Optional)
- **Backend Only:** `npm run backend`
- **Mobile App Only:** `npm run expo`

---

## Demo Accounts (Password: `Password@123`)

| Role | Username | Mobile | Description |
| :--- | :--- | :--- | :--- |
| **Aavin Admin** | `admin_aavin` | `9842000001` | Operations, AI Settings, Audit, Review |
| **Farmer (Owner 1)** | `farmer_murugan` | `9842000002` | Melur Rural, Cows 1001 & 1002 (Under Treatment) |
| **Farmer (Owner 2)** | `farmer_selvi` | `9842000003` | Navinipatti, Cows 1003 & 1004 |
| **Veterinary Doctor** | `vet_anand` | `9842000004` | Dr. R. Anand BVSc, Treatments, Withdrawals |
| **Collection Centre** | `operator_kannan` | `9842000005` | Melur CC Operator, Milk Intake & Receipts |
| **Transport Vendor** | `vendor_kumar` | `9842000006` | Tanker Logistics to Madurai Dairy Plant |

*Tip: Use the 1-Tap Quick Login buttons on the sign-in screen.*

---

## Standalone Builds

- **Android Standalone APK:** `eas build -p android --profile preview`
- **iOS Simulator / Device:** `eas build -p ios --profile preview`

---

## Documentation Links

- [System Architecture](docs/architecture.md)
- [Setup & LAN Configuration Guide](docs/setup.md)
- [REST API Contract Reference](docs/api.md)
- [Demo Credentials](docs/demo-accounts.md)
- [Verification & Test Report](docs/test-report.md)
