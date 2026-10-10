# Aavin Smart Cattle Passport — Setup & Execution Guide

## 1. Database Setup via XAMPP & phpMyAdmin

1. Open **XAMPP Control Panel** on Windows.
2. Start **Apache** and **MySQL** services.
3. Open your browser to: `http://localhost/phpmyadmin/`
4. Click on the **Import** tab:
   - Select and import `database/schema.sql` (Creates `aavin_milkflow` database with all 40 relational tables).
5. Next, click on database `aavin_milkflow` in the left sidebar, open the **Import** tab, and import `database/seed.sql` (Populates demo accounts, cattle passports, treatments, and AI configuration).

---

## 2. Run Full Full-Stack Project (Backend + Mobile App)

In the root directory, simply run:
```bash
npm start
```
*(or `npm run dev`)*

This concurrently starts:
- **Backend Node.js Server:** `http://localhost:4000` (Milk Safety Twin Engine + MySQL connection)
- **Expo Mobile Server:** Expo SDK 54 dev server with QR code for Expo Go.

---

## 3. Alternative Individual Component Execution (Optional)

### Backend Only:
```bash
npm run backend
```
*(or `cd backend && npm run dev`)*

### Mobile App Only:
```bash
npm run expo
```
3. **Connecting via Expo Go:**
   - **Android Device:** Scan the QR code in Expo CLI using the **Expo Go** app. Ensure your phone is on the same Wi-Fi network as your computer.
   - **LAN API URL Setup:** On the login screen, tap **⚙️ Server Settings** and enter your PC LAN IP: `http://<YOUR_LOCAL_IP>:4000/api/v1` (e.g. `http://192.168.1.100:4000/api/v1`), then tap **Test Connection**.
   - **iOS Simulator / Device:** Press `i` in the Expo terminal or scan QR code with iOS Camera.
   - **Web Browser:** Press `w` in the Expo terminal.

---

## 4. Standalone Android APK & iOS Build Commands

### Android Standalone APK Build (EAS)
1. Ensure EAS CLI is installed: `npm install -g eas-cli`
2. Log in with your Expo account: `eas login`
3. Build standalone preview APK (profile defined in `eas.json`):
   ```bash
   eas build -p android --profile preview
   ```
4. The generated APK download link will be provided in your terminal upon EAS build completion.

### iOS Build (Simulator / TestFlight)
```bash
eas build -p ios --profile preview
```
*Note: iOS device installations require Apple Developer account provisioning and certificates.*
