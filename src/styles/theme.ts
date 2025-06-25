import { MD3LightTheme } from 'react-native-paper';
import { Platform } from 'react-native';

// Book-inspired color palette with soft amber tones
export const BookColors = {
  // Primary amber shades
  primary: '#D4A574', // Warm amber
  primaryDark: '#B8956A', // Darker amber
  primaryLight: '#E6C09B', // Lighter amber
  
  // Secondary warm tones
  secondary: '#8B4513', // Saddle brown
  secondaryLight: '#A0522D', // Sienna
  
  // Background colors (parchment-like)
  background: '#FAF7F0', // Warm cream
  surface: '#FFF9F0', // Soft ivory
  surfaceVariant: '#F5F0E8', // Light parchment
  
  // Text colors (ink-like)
  onSurface: '#2D1810', // Dark brown
  onSurfaceVariant: '#5D4E37', // Medium brown
  onPrimary: '#FFFFFF', // White for primary buttons
  
  // Accent colors
  accent: '#CD853F', // Peru
  accentLight: '#DEB887', // Burlywood
  
  // Status colors with warm tones
  success: '#8FBC8F', // Dark sea green
  warning: '#DAA520', // Goldenrod
  error: '#CD5C5C', // Indian red
  info: '#4682B4', // Steel blue
  
  // Special colors
  ink: '#1C1C1C', // Dark ink
  parchment: '#F7F3E9', // Old parchment
  leather: '#8B4513', // Leather brown
  gold: '#FFD700', // Gold accent
  
  // Shadow colors
  shadow: 'rgba(139, 69, 19, 0.2)', // Brown shadow
  cardShadow: 'rgba(212, 165, 116, 0.3)', // Amber shadow
};

// Typography system with serif fonts
export const BookTypography = {
  // Font families
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'serif',
  }),
  sansSerif: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'sans-serif',
  }),
  
  // Font sizes
  sizes: {
    xs: 10,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
    '5xl': 32,
    '6xl': 36,
  },
  
  // Font weights
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

// React Native Paper theme customization
export const bookTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: BookColors.primary,
    primaryContainer: BookColors.primaryLight,
    secondary: BookColors.secondary,
    secondaryContainer: BookColors.secondaryLight,
    surface: BookColors.surface,
    surfaceVariant: BookColors.surfaceVariant,
    background: BookColors.background,
    onSurface: BookColors.onSurface,
    onSurfaceVariant: BookColors.onSurfaceVariant,
    onPrimary: BookColors.onPrimary,
  },
  fonts: {
    ...MD3LightTheme.fonts,
    default: {
      fontFamily: BookTypography.serif,
    },
    headlineSmall: {
      ...MD3LightTheme.fonts.headlineSmall,
      fontFamily: BookTypography.serif,
      fontWeight: BookTypography.weights.bold,
    },
    headlineMedium: {
      ...MD3LightTheme.fonts.headlineMedium,
      fontFamily: BookTypography.serif,
      fontWeight: BookTypography.weights.bold,
    },
    headlineLarge: {
      ...MD3LightTheme.fonts.headlineLarge,
      fontFamily: BookTypography.serif,
      fontWeight: BookTypography.weights.bold,
    },
    titleSmall: {
      ...MD3LightTheme.fonts.titleSmall,
      fontFamily: BookTypography.serif,
      fontWeight: BookTypography.weights.semibold,
    },
    titleMedium: {
      ...MD3LightTheme.fonts.titleMedium,
      fontFamily: BookTypography.serif,
      fontWeight: BookTypography.weights.semibold,
    },
    titleLarge: {
      ...MD3LightTheme.fonts.titleLarge,
      fontFamily: BookTypography.serif,
      fontWeight: BookTypography.weights.bold,
    },
    bodySmall: {
      ...MD3LightTheme.fonts.bodySmall,
      fontFamily: BookTypography.serif,
    },
    bodyMedium: {
      ...MD3LightTheme.fonts.bodyMedium,
      fontFamily: BookTypography.serif,
    },
    bodyLarge: {
      ...MD3LightTheme.fonts.bodyLarge,
      fontFamily: BookTypography.serif,
    },
    labelSmall: {
      ...MD3LightTheme.fonts.labelSmall,
      fontFamily: BookTypography.sansSerif,
    },
    labelMedium: {
      ...MD3LightTheme.fonts.labelMedium,
      fontFamily: BookTypography.sansSerif,
    },
    labelLarge: {
      ...MD3LightTheme.fonts.labelLarge,
      fontFamily: BookTypography.sansSerif,
    },
  },
};

// Common styles for book-like elements
export const BookStyles = {
  // Card styles with parchment look
  card: {
    backgroundColor: BookColors.surface,
    borderRadius: 12,
    elevation: 4,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: BookColors.primaryLight,
  },
  
  // Page-like container
  page: {
    backgroundColor: BookColors.parchment,
    padding: 20,
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BookColors.primaryLight,
    shadowColor: BookColors.cardShadow,
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Button styles
  primaryButton: {
    backgroundColor: BookColors.primary,
    borderRadius: 8,
    elevation: 2,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  
  // Text styles
  heading: {
    fontFamily: BookTypography.serif,
    fontWeight: BookTypography.weights.bold,
    color: BookColors.onSurface,
  },
  
  body: {
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    lineHeight: 24,
  },
  
  // Input styles
  input: {
    backgroundColor: BookColors.surface,
    borderColor: BookColors.primaryLight,
    borderRadius: 8,
  },
};

export default {
  colors: BookColors,
  typography: BookTypography,
  theme: bookTheme,
  styles: BookStyles,
};