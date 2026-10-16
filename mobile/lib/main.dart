import 'package:flutter/material.dart';

import 'app.dart';
import 'core/firebase_setup.dart';
import 'features/outbox/outbox.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await setupFirebase();
  // Loads orders saved while offline and tries to send them. Not awaited, so a
  // weak connection never delays the app opening.
  Outbox.instance.start();
  runApp(const BakeryApp());
}
