# Mobile app

Customer app for Android and iOS: browse cakes, place orders, track their status. Flutter (stable channel).

```bash
flutter pub get
flutter run                                              # Android emulator, talks to http://10.0.2.2:4000/api
flutter run --dart-define=API_URL=http://192.168.1.20:4000/api   # real phone: use your computer's Wi-Fi IP
flutter analyze
flutter test
```

The backend must be running (see `../backend`). With `AUTH_DEV_BYPASS=true` on the backend, the app signs in as a fake customer (`DEV_USER`, default `dev-customer`) until Firebase Auth is added.

## Layout

Code is grouped by feature, so each screen's model, UI and logic sit together:

```
lib/
├── core/               Shared setup: API client, config, theme
├── features/
│   ├── catalogue/      Product list
│   └── orders/         Order form, my orders, order model
├── app.dart            MaterialApp and bottom navigation
└── main.dart
```

Add new features as new folders under `features/` (e.g. `auth/`, `tracking/`).

## Next steps

- Firebase Auth sign-in, then send the ID token from `core/api_client.dart`
- Full order form (all fields in `docs/api.md`) and inspiration image upload with on-device compression
- Push notifications with Firebase Cloud Messaging
- Offline: cache the catalogue, save order drafts locally and submit when back online
