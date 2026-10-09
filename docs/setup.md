# Setting up your computer

Do this once per computer. It takes about an hour, mostly downloads, so do it on good Wi-Fi.

You need:

| Tool | Why | Needed by |
|---|---|---|
| Git | Get the code, commit, push | Everyone |
| Node.js 22 or newer (LTS) | Runs the backend and dashboard | Everyone |
| Docker Desktop | Runs the PostgreSQL database | Everyone running the backend ([no Docker?](#cant-run-docker)) |
| Flutter SDK + Android Studio | Builds and runs the mobile app | Mobile work; everyone else optional |
| VS Code | Editor | Recommended |

Jump to your system: [Windows](#windows) · [macOS](#macos) · [Linux (Ubuntu)](#linux-ubuntu). Then continue with [Get the project running](#get-the-project-running).

---

## Windows

Use **PowerShell** for every command below (Start menu → type "PowerShell"). Windows 10 (version 1809 or newer) and Windows 11 include `winget`, which installs apps from the command line.

### 1. Git, Node.js, VS Code

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Microsoft.VisualStudioCode -e
```

**Close PowerShell and open a new one**, then check:

```powershell
git --version
node --version     # must be v22 or higher
```

Tell Git who you are (use the email on your GitHub account):

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

### 2. Docker Desktop

Docker Desktop on Windows needs WSL 2 (Windows Subsystem for Linux).

```powershell
wsl --install          # run PowerShell as Administrator for this one
```

Restart the computer, then:

```powershell
winget install --id Docker.DockerDesktop -e
```

Open Docker Desktop from the Start menu and accept the terms. Wait until it says "Engine running".

If Docker complains that **virtualization is disabled**, it must be switched on in the BIOS/UEFI settings (often called "Intel VT-x", "AMD-V" or "SVM"). Search "enable virtualization" plus your laptop model. If that isn't possible, use [the no-Docker option](#cant-run-docker).

Docker Desktop uses a lot of memory. Quit it (system tray icon → Quit) when you're not working on the project.

### 3. Flutter and Android Studio (mobile)

1. Install Android Studio:
   ```powershell
   winget install --id Google.AndroidStudio -e
   ```
   Open it once and click through the setup wizard. It downloads the Android SDK.
2. In Android Studio: **More Actions → SDK Manager → SDK Tools tab**, tick **Android SDK Command-line Tools**, click Apply.
3. Install Flutter: open VS Code, install the **Flutter** extension, then press `Ctrl+Shift+P` → **Flutter: New Project**. VS Code offers to **Download SDK**. Choose a folder with **no spaces** in its path, such as `C:\src`, not `C:\Program Files`. When it asks, let it **add Flutter to your PATH**.
4. Close and reopen PowerShell, then:
   ```powershell
   flutter doctor
   flutter doctor --android-licenses     # press y to accept each licence
   ```
   `flutter doctor` should show ✓ for Flutter, Android toolchain and VS Code. Visual Studio (for Windows desktop apps) can be ignored; we don't build for Windows.

iPhone builds need a Mac. On Windows you test with an Android emulator or an Android phone.

---

## macOS

Install [Homebrew](https://brew.sh) first (paste the command from its home page into Terminal), then:

```bash
brew install git node
brew install --cask docker visual-studio-code android-studio flutter
```

- Open **Docker** from Applications and wait for "Engine running".
- Open **Android Studio** once and finish the setup wizard. Then go to **More Actions → SDK Manager → SDK Tools** and tick **Android SDK Command-line Tools**.
- Then:
  ```bash
  git config --global user.name "Your Name"
  git config --global user.email "you@example.com"
  flutter doctor
  flutter doctor --android-licenses
  ```
- To run the app on an iPhone/iOS simulator you also need **Xcode** from the App Store. Android is enough for development.

---

## Linux (Ubuntu)

```bash
sudo apt update && sudo apt install -y git curl unzip xz-utils

# Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
# close and reopen the terminal, then:
nvm install --lts

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER      # then log out and back in

# Flutter
git clone --depth 1 -b stable https://github.com/flutter/flutter.git ~/development/flutter
echo 'export PATH="$HOME/development/flutter/bin:$PATH"' >> ~/.bashrc
```

Install Android Studio from <https://developer.android.com/studio> (or `sudo snap install android-studio --classic`), run its setup wizard, add **Android SDK Command-line Tools** in the SDK Manager. Then run `flutter doctor --android-licenses`.

Start Docker only when you need it: `sudo systemctl start docker`. Stop it afterwards with `sudo systemctl stop docker docker.socket`.

---

## Get the project running

### 1. Get the code

Accept the GitHub invitation email for `JMinallah/bakery-order-system` first, then:

```bash
git clone https://github.com/JMinallah/bakery-order-system.git
cd bakery-order-system
```

The first time you clone or push, Git asks you to sign in to GitHub in the browser.

### 2. Database

With Docker running:

```bash
docker compose up -d
```

### 3. Backend

```bash
cd backend
npm install
```

Create your settings file from the example:

| Windows (PowerShell) | macOS / Linux |
|---|---|
| `Copy-Item .env.example .env` | `cp .env.example .env` |

Then:

```bash
npm run db:migrate      # creates the tables
npm run db:seed         # sample cakes and a staff user
npm run dev
```

Leave it running. Open <http://localhost:4000/api/products> in a browser: you should see a list of cakes.

### 4. Dashboard

In a **second** terminal, from the project folder:

```bash
cd dashboard
npm install
```

| Windows (PowerShell) | macOS / Linux |
|---|---|
| `Copy-Item .env.example .env.local` | `cp .env.example .env.local` |

```bash
npm run dev
```

Open <http://localhost:5173>.

### 5. Mobile app

Start an Android emulator first: Android Studio → **More Actions → Virtual Device Manager → Create device** (a Pixel with a recent Android version), then press ▶. Or plug in an Android phone with **USB debugging** turned on. Then, in a **third** terminal:

```bash
cd mobile
flutter pub get
flutter run
```

On a **real phone**, the app can't reach `localhost`. Connect the phone and computer to the same Wi-Fi, find your computer's IP address (`ipconfig` on Windows, look for "IPv4 Address"), and run:

```bash
flutter run --dart-define=API_URL=http://192.168.1.20:4000/api
```

If Windows Firewall asks whether to allow Node.js on private networks, click **Allow**.

### When you're done

Stop the servers with `Ctrl+C` in each terminal, then stop the database:

```bash
docker compose stop
```

Your data is kept for next time. Quit Docker Desktop to free memory.

---

## Can't run Docker?

If your computer can't run Docker (not enough memory, virtualization can't be enabled), use either of these instead. Skip `docker compose` and change `DATABASE_URL` in `backend/.env`.

**Option A: a free online database (easiest).** Create a free project at <https://neon.tech>, copy the connection string it shows (starts with `postgresql://`), and paste it as `DATABASE_URL`. Each teammate should create their own so you don't overwrite each other's test data.

**Option B: install PostgreSQL directly.** Windows: download the installer from <https://www.postgresql.org/download/windows/>, remember the password you set for the `postgres` user, then use:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres
```

Then carry on with `npm run db:migrate`.

---

## Common problems

| Problem | Fix |
|---|---|
| `node`, `git` or `flutter` "is not recognized" | Close and reopen the terminal (and VS Code) after installing. |
| `npm run db:migrate` says it can't reach the database | Docker isn't running, or you forgot `docker compose up -d`. |
| Port 5432 already in use | Another PostgreSQL is running on your computer. Stop it, or change the left number in `docker-compose.yml` to `"5433:5432"` and use `localhost:5433` in `DATABASE_URL`. |
| Dashboard shows "Failed to fetch" | The backend isn't running (step 3). |
| Mobile app can't load cakes on a real phone | Use your computer's IP with `--dart-define=API_URL=...` and check both are on the same Wi-Fi. |
| `flutter doctor` shows Android licence errors | `flutter doctor --android-licenses` and accept them all. |
| PowerShell says running scripts is disabled (for `npm`) | Run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
