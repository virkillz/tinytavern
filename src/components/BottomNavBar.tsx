import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
      key: 'Chat',
      icon: 'chat',
      label: 'Chat',
      onPress: () => navigation.navigate('Chat'),
    },
    {
      key: 'BookChat',
      icon: 'book-open',
      label: 'Book',
      onPress: () => navigation.navigate('BookChat'),
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
    if (itemKey === 'Chat' && (currentRoute === 'Chat' || currentRoute === 'Characters' || currentRoute === 'CharacterDetail' || currentRoute === 'CharacterEdit')) {
      return true;
    }
    if (itemKey === 'BookChat' && (currentRoute === 'BookChat' || currentRoute === 'Books' || currentRoute === 'BookDetail' || currentRoute === 'BookEdit')) {
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
            style={styles.navItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <IconButton
              icon={item.icon}
              size={24}
              iconColor={active ? '#2196f3' : '#666'}
              style={styles.navIcon}
            />
            <Text style={[
              styles.navLabel,
              { color: active ? '#2196f3' : '#666' }
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
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navIcon: {
    margin: 0,
    width: 32,
    height: 32,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});