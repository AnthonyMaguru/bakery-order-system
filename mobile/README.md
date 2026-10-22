# Mobile app

Customer app for Android and iOS: find a bakery, order a ready made cake or design one in the cake builder, accept the bakery's quote, and follow the order. Flutter (stable channel), following the team's designs (https://claude.ai/artifact/8CSPeqAqPBZBjeSxiFr7bF).

```bash
flutter pub get
flutter run                                              # Android emulator, talks to http://10.0.2.2:4000/api
flutter run --dart-define=API_URL=http://192.168.1.20:4000/api   # real phone: use your computer's Wi-Fi IP
flutter analyze
flutter test
```

The backend must be running and seeded (see `../backend`). With `AUTH_DEV_BYPASS=true` on the backend and no Firebase settings, the app uses a test customer (`DEV_USER`, default `dev-customer`). For Firebase, pass the values from `firebase.example.json` with `--dart-define-from-file=firebase.json`.

## Firebase setup for Android and iOS

This is a single Flutter codebase, but Android and iOS still each need their native Firebase config:

- Android: copy `android/app/google-services.json.example` to `android/app/google-services.json` and fill in the real values for your Firebase Android app.
- iOS: copy `ios/Runner/GoogleService-Info.plist.example` to `ios/Runner/GoogleService-Info.plist`, then add that file to the Runner target in Xcode and match the bundle ID to your Firebase iOS app.
- Shared Flutter config: copy `firebase.example.json` to `firebase.json` and pass it with `--dart-define-from-file=firebase.json` for the app's Dart-side `FirebaseOptions`.

If you use FlutterFire, `flutterfire configure` will generate the platform config files automatically. The repo keeps the real values out of git via the patterns in `.gitignore`.

## What customers can do

- **Find a bakery.** With one bakery (the pilot) the app opens it straight away. With more, customers choose their area and see the bakeries that deliver there, soonest available first.
- **Order a ready made cake.** Product, quick checkout, done. The price is known, so there is no quote.
- **Design a cake in 5 steps.** The builder uses the bakery's own options and prices (out of stock options never appear), draws the cake as they choose, and shows an estimate. Or they describe it in their own words instead.
- **Pick a date that works.** The date picker only offers days the bakery can still take the order.
- **Accept the quote, pay, follow progress, message the bakery, or cancel** while the bakery hasn't started.

## Weak connections

Built for networks that come and go:

- **Orders are never lost.** If an order can't be sent, it is saved on the phone and sent by itself when the app comes back to the foreground, every 30 seconds while something is waiting, and on the next launch. See `features/outbox/outbox.dart`.
- **Orders are never sent twice.** Each order gets an id (`clientRequestId`) made on the phone; resending it returns the order the backend already saved.
- **Menus still show offline.** Bakeries, products and builder options are kept from the last visit (`core/cache.dart`), with a banner saying so.
- **Clear about what happened.** "Saved on your phone", "Waiting to send", or the bakery's reason if it refused the order.

## Layout

```
lib/
├── core/               API client, offline cache, formatting, theme, shared widgets
├── models/             Bakery, Product, builder options, Order (parsed from the API)
├── features/
│   ├── bakeries/       Choosing a bakery, the bakery page
│   ├── product/        Product page, quick checkout
│   ├── custom_order/   The 5 steps, builder rules, cake preview
│   ├── orders/         My orders, order details, after sending
│   ├── outbox/         Orders saved while offline
│   └── common/         Date picker, pickup or delivery fields
├── app.dart            MaterialApp and bottom navigation
└── main.dart
test/
├── rules_test.dart          Builder rules, formatting, request ids
├── outbox_test.dart         Offline saving and sending, with a fake backend
├── models_and_draft_test.dart
├── builder_step_test.dart   The builder screen updates the estimate
├── api_contract_test.dart   Parses real backend responses in test/fixtures
└── fixtures/
```

Rules that decide things are plain Dart so they're easy to test: `builder_rules.dart` matches the backend's rules for builder choices and estimates.

## Release builds

Debug builds use the local Android debug key. Release builds intentionally fail unless a production signing key is configured.

1. Create and store the upload keystore in a private secrets location, not in the repository:

	```bash
	mkdir -p android/release-keystore
	keytool -genkeypair -v -keystore android/release-keystore/upload-keystore.jks \
	  -keyalg RSA -keysize 2048 -validity 10000 -alias bakery-orders
	```

2. Copy `android/key.properties.example` to `android/key.properties` and replace every `CHANGE_ME` value. Keep both files private; `.gitignore` excludes them.

3. Build with the release Firebase configuration:

	```bash
	flutter build apk --release --dart-define-from-file=firebase.json
	```

For CI, store the keystore and passwords in the CI secret store, create these files during the build, and delete them after the artifact is produced. Never commit `key.properties`, `.jks` files, or production Firebase configuration.

## Next steps

- Firebase Auth sign in, then send the ID token from `core/api_client.dart`
- Inspiration photos and a picture of the builder preview: compressed on the phone and uploaded through the API
- Push notifications with Firebase Cloud Messaging (quotes, status changes)
- Bundle the designs' fonts (Bricolage Grotesque and Figtree) as assets
- Saved drafts of unfinished designs
