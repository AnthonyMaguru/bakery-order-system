import 'package:flutter/material.dart';

import 'app.dart';
import 'features/outbox/outbox.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Loads orders saved while offline and tries to send them. Not awaited, so a
  // weak connection never delays the app opening.
  Outbox.instance.start();
  runApp(const BakeryApp());
}
