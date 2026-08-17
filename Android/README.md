# Android App

Kotlin + Jetpack Compose frontend.

Expected responsibilities:

- Authentication UI.
- Product search and registration.
- Routine and usage logging.
- Skin condition logging.
- Skin photo upload flow.
- Analysis and report screens.

Package name and app name can be decided when the Android project is initialized.

Current package name:

```text
com.hackathon.skindata
```

## Setup

Android SDK path and local runtime values are configured in `local.properties`.

```properties
sdk.dir=C\:\\Users\\psm30\\AppData\\Local\\Android\\Sdk
SUPABASE_URL=https://bahxouspkfbjoagcfjsr.supabase.co
SUPABASE_ANON_KEY=your-local-anon-key
BACKEND_BASE_URL=http://10.0.2.2:3000
```

`local.properties` is ignored by Git and should be created locally by each
developer if their SDK path is different.

Demo login:

```text
email: demo@example.com
password: demo1234
```

## Build

```bash
./gradlew :app:assembleDebug
```

On Windows:

```powershell
.\gradlew.bat :app:assembleDebug
```

Debug APK output:

```text
Android/app/build/outputs/apk/debug/app-debug.apk
```
