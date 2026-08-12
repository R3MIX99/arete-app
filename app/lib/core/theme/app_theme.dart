import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_radius_extension.dart';
import 'app_spacing.dart';
import 'app_typography.dart';

/// Construye los `ThemeData` claro y oscuro a partir de los tokens del
/// sistema de diseño (colores, tipografía, espaciado, radios y sombras).
///
/// Estética de referencia: minimalista tipo shadcn/ui — tarjetas con
/// bordes redondeados suaves, mucho espacio en blanco, tipografía con
/// jerarquía clara, sombras sutiles en vez de bordes duros. Material 3 con
/// estilo personalizado, no componentes shadcn literales.
class AppTheme {
  const AppTheme._();

  static ThemeData get light => _build(brightness: Brightness.light);

  static ThemeData get dark => _build(brightness: Brightness.dark);

  static ThemeData _build({required Brightness brightness}) {
    final isDark = brightness == Brightness.dark;

    final colorScheme = ColorScheme(
      brightness: brightness,
      primary: AppColors.accent,
      onPrimary: AppColors.onAccent,
      secondary: AppColors.accentMuted,
      onSecondary: AppColors.neutral900,
      error: AppColors.danger,
      onError: AppColors.neutral0,
      surface: isDark ? AppColors.darkSurface : AppColors.lightSurface,
      onSurface: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
      surfaceContainerHighest:
          isDark ? AppColors.neutral800 : AppColors.neutral100,
      outline: isDark ? AppColors.darkBorder : AppColors.lightBorder,
    );

    // Fondo del indicador de selección (pestaña activa) en navegación:
    // en claro es el lavanda muy pálido de accentMuted; en oscuro ese
    // mismo tono se ve como un borrón blanco sin contraste (el bug que
    // se reportó), así que se mezcla el acento con la superficie oscura
    // en vez de reutilizar el token pensado para fondos claros.
    final navigationIndicatorColor = isDark
        ? Color.alphaBlend(
            AppColors.accent.withValues(alpha: 0.24),
            AppColors.darkSurface,
          )
        : AppColors.accentMuted;

    final textTheme = TextTheme(
      displayLarge: AppTypography.displayLarge.copyWith(
        color: colorScheme.onSurface,
      ),
      headlineMedium: AppTypography.headlineMedium.copyWith(
        color: colorScheme.onSurface,
      ),
      titleMedium: AppTypography.titleMedium.copyWith(
        color: colorScheme.onSurface,
      ),
      bodyLarge: AppTypography.bodyLarge.copyWith(
        color: colorScheme.onSurface,
      ),
      bodyMedium: AppTypography.bodyMedium.copyWith(
        color: isDark
            ? AppColors.darkTextSecondary
            : AppColors.lightTextSecondary,
      ),
      labelLarge: AppTypography.labelSecondary.copyWith(
        color: isDark
            ? AppColors.darkTextSecondary
            : AppColors.lightTextSecondary,
      ),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor:
          isDark ? AppColors.darkBackground : AppColors.lightBackground,
      textTheme: textTheme,
      fontFamily: AppTypography.fontFamily,
      extensions: [AppRadiusExtension.standard],
      // En oscuro las tarjetas llevan el look "de vidrio" pedido para todo
      // el panel: relleno translúcido, borde gris claro visible y una
      // sombra sutil (nada de blur por tarjeta — con muchas tarjetas juntas
      // se veía parchado/trabado). En claro se deja la estética shadcn/ui
      // original: relleno sólido, sin sombra, borde tenue.
      cardTheme: CardThemeData(
        color: isDark ? AppColors.darkGlassFill : colorScheme.surface,
        elevation: isDark ? 3 : 0,
        shadowColor: isDark ? Colors.black.withValues(alpha: 0.45) : null,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          side: BorderSide(
            color: isDark ? AppColors.darkGlassBorder : colorScheme.outline,
            width: 1,
          ),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        foregroundColor: colorScheme.onSurface,
        titleTextStyle: textTheme.titleMedium,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colorScheme.primary,
          foregroundColor: colorScheme.onPrimary,
          elevation: 0,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.md,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          textStyle: AppTypography.bodyLarge.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: colorScheme.onSurface,
          side: BorderSide(color: colorScheme.outline),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.md,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colorScheme.surfaceContainerHighest,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.md,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: colorScheme.primary, width: 1.5),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        height: 64,
        indicatorColor: navigationIndicatorColor,
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            color: states.contains(WidgetState.selected)
                ? colorScheme.primary
                : (isDark
                    ? AppColors.darkTextSecondary
                    : AppColors.lightTextSecondary),
          ),
        ),
        labelTextStyle: WidgetStateProperty.all(AppTypography.labelSecondary),
      ),
      // El panel de entrenador usa NavigationRail (tablet/escritorio) y
      // NavigationDrawer (teléfono); sin estos temas explícitos, Material
      // 3 usa sus colores de indicador/ícono por defecto, que no están
      // pensados para esta paleta y pierden contraste en modo oscuro.
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: colorScheme.surface,
        indicatorColor: navigationIndicatorColor,
        selectedIconTheme: IconThemeData(color: colorScheme.primary),
        unselectedIconTheme: IconThemeData(
          color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
        ),
        selectedLabelTextStyle: AppTypography.labelSecondary.copyWith(
          color: colorScheme.primary,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelTextStyle: AppTypography.labelSecondary.copyWith(
          color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
        ),
      ),
      navigationDrawerTheme: NavigationDrawerThemeData(
        backgroundColor: colorScheme.surface,
        indicatorColor: navigationIndicatorColor,
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            color: states.contains(WidgetState.selected)
                ? colorScheme.primary
                : (isDark
                    ? AppColors.darkTextSecondary
                    : AppColors.lightTextSecondary),
          ),
        ),
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => AppTypography.labelSecondary.copyWith(
            color: states.contains(WidgetState.selected)
                ? colorScheme.primary
                : (isDark
                    ? AppColors.darkTextSecondary
                    : AppColors.lightTextSecondary),
            fontWeight: states.contains(WidgetState.selected)
                ? FontWeight.w600
                : FontWeight.w500,
          ),
        ),
      ),
      dividerTheme: DividerThemeData(
        color: colorScheme.outline,
        thickness: 1,
        space: 1,
      ),
    );
  }
}
