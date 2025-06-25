import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookColors, BookTypography } from '../styles/theme';

interface BottomNavBarProps {
  navigation: any;
  currentRoute: string;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ navigation, currentRoute }) => {
  const insets = useSafeAreaInsets();

  const navItems = [
    {
      key: 'Home',
      icon: 'home',
      label: 'Home',
      onPress: () => navigation.navigate('Home'),
    },
    {
      key: 'Characters',
      icon: 'account-group',
      label: 'Chat',
      onPress: () => navigation.navigate('Characters'),
    },
    {
      key: 'Books',
      icon: 'book-multiple',
      label: 'Story',
      onPress: () => navigation.navigate('Books'),
    },
    {
      key: 'Gallery',
      icon: 'image-multiple',
      label: 'Gallery',
      onPress: () => navigation.navigate('Gallery'),
    },
    {
      key: 'Profile',
      icon: 'account',
      label: 'Profile',
      onPress: () => navigation.navigate('Profile'),
    },
  ];

  const isActive = (itemKey: string) => {
    // Handle different route names that should highlight the same nav item
    if (itemKey === 'Characters' && (currentRoute === 'Chat' || currentRoute === 'Characters' || currentRoute === 'CharacterDetail' || currentRoute === 'CharacterEdit')) {
      return true;
    }
    if (itemKey === 'Books' && (currentRoute === 'BookChat' || currentRoute === 'Books' || currentRoute === 'BookDetail' || currentRoute === 'BookEdit')) {
      return true;
    }
    if (itemKey === 'Gallery' && (currentRoute === 'Gallery' || currentRoute === 'ImageGeneration')) {
      return true;
    }
    return currentRoute === itemKey;
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {navItems.map((item) => {
        const active = isActive(item.key);
        return (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.navItem,
              active && styles.navItemActive
            ]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={[
              styles.navIconContainer,
              active && styles.navIconContainerActive
            ]}>
              <IconButton
                icon={item.icon}
                size={22}
                iconColor={active ? BookColors.onPrimary : BookColors.onSurfaceVariant}
                style={styles.navIcon}
              />
            </View>
            <Text style={[
              styles.navLabel,
              { color: active ? BookColors.primary : BookColors.onSurfaceVariant }
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: BookColors.surface,
    borderTopWidth: 1,
    borderTopColor: BookColors.primaryLight,
    elevation: 8,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  navItemActive: {
    // No additional styling needed - visual feedback comes from icon container
  },
  navIconContainer: {
    borderRadius: 16,
    marginBottom: 4,
    padding: 2,
  },
  navIconContainerActive: {
    backgroundColor: BookColors.primary,
    elevation: 2,
    shadowColor: BookColors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  navIcon: {
    margin: 0,
    width: 28,
    height: 28,
  },
  navLabel: {
    fontSize: 11,
    fontFamily: BookTypography.serif,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});