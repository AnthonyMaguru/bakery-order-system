import 'package:flutter/material.dart';

/// Colours from the team's designs (https://claude.ai/artifact/8CSPeqAqPBZBjeSxiFr7bF).
/// Flat colours only: no gradients, and no cards inside cards.
abstract final class AppColors {
  static const ink = Color(0xFF2B1B14);
  static const ink2 = Color(0xFF4A3329);
  static const muted = Color(0xFF6B5348);
  static const ground = Color(0xFFFBF5EF);
  static const surface = Color(0xFFFFFFFF);
  static const line = Color(0xFFE9DDD3);
  static const lineStrong = Color(0xFFE2D3C8);
  static const sand = Color(0xFFF4EBE3);
  static const accent = Color(0xFFA62B52);
  static const accentSoft = Color(0xFFF7E9EE);
  static const danger = Color(0xFF9B2C2C);
  static const dangerSoft = Color(0xFFF8E1E1);
  static const warn = Color(0xFF8A4208);
  static const warnSoft = Color(0xFFFBEBD9);
  static const ok = Color(0xFF2F6B3A);
  static const okSoft = Color(0xFFE1F0DE);
  static const info = Color(0xFF24507A);
  static const infoSoft = Color(0xFFE2ECF6);
  static const violet = Color(0xFF4E3580);
  static const violetSoft = Color(0xFFECE6F6);
}

final _radius = BorderRadius.circular(14);

final appTheme = ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(
    seedColor: AppColors.accent,
    primary: AppColors.accent,
    onPrimary: Colors.white,
    surface: AppColors.ground,
    onSurface: AppColors.ink,
    error: AppColors.danger,
  ),
  scaffoldBackgroundColor: AppColors.ground,
  dividerColor: AppColors.line,
  appBarTheme: const AppBarTheme(
    backgroundColor: AppColors.ground,
    foregroundColor: AppColors.ink,
    elevation: 0,
    scrolledUnderElevation: 0,
    centerTitle: false,
  ),
  textTheme: const TextTheme(
    headlineMedium: TextStyle(fontSize: 30, fontWeight: FontWeight.w700, letterSpacing: -0.6, color: AppColors.ink, height: 1.1),
    titleLarge: TextStyle(fontSize: 21, fontWeight: FontWeight.w700, color: AppColors.ink),
    titleMedium: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: AppColors.ink),
    bodyLarge: TextStyle(fontSize: 16, color: AppColors.ink, height: 1.45),
    bodyMedium: TextStyle(fontSize: 15, color: AppColors.ink, height: 1.45),
    bodySmall: TextStyle(fontSize: 13, color: AppColors.muted, height: 1.4),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      minimumSize: const Size.fromHeight(54),
      shape: RoundedRectangleBorder(borderRadius: _radius),
      textStyle: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
    ),
  ),
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      minimumSize: const Size.fromHeight(50),
      foregroundColor: AppColors.ink,
      side: const BorderSide(color: AppColors.ink, width: 1.5),
      shape: RoundedRectangleBorder(borderRadius: _radius),
      textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
    ),
  ),
  textButtonTheme: TextButtonThemeData(
    style: TextButton.styleFrom(
      minimumSize: const Size(44, 44),
      foregroundColor: AppColors.accent,
      textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: AppColors.surface,
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.lineStrong, width: 1.5)),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.lineStrong, width: 1.5)),
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.ink, width: 1.5)),
    hintStyle: const TextStyle(color: Color(0xFF8A736A)),
  ),
  chipTheme: ChipThemeData(
    backgroundColor: AppColors.surface,
    selectedColor: AppColors.accentSoft,
    side: const BorderSide(color: AppColors.lineStrong, width: 1.5),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
    labelStyle: const TextStyle(fontSize: 15, color: AppColors.ink),
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
    showCheckmark: false,
  ),
  navigationBarTheme: const NavigationBarThemeData(
    backgroundColor: AppColors.surface,
    indicatorColor: AppColors.accentSoft,
    height: 72,
  ),
  bottomSheetTheme: const BottomSheetThemeData(
    backgroundColor: AppColors.surface,
    showDragHandle: true,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
  ),
  snackBarTheme: const SnackBarThemeData(backgroundColor: AppColors.ink, behavior: SnackBarBehavior.floating),
);
