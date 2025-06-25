import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Title,
  Paragraph,
  Card,
  Button,
  Avatar,
  Surface,
  IconButton,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService } from '../utils/storage';
import { CharacterStorageService } from '../services/characterStorage';
import { BookStorageService } from '../services/bookStorage';
import { AppSettings } from '../types';
import { BookColors, BookTypography } from '../styles/theme';

interface Props {
  navigation: any;
}

interface Stats {
  characterCount: number;
  bookCount: number;
}

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [stats, setStats] = useState<Stats>({ characterCount: 0, bookCount: 0 });
  const [userProfile, setUserProfile] = useState<{ name: string; avatar?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load settings and user profile
      const [savedSettings, savedUserProfile] = await Promise.all([
        StorageService.getSettings(),
        StorageService.getUserProfile()
      ]);
      
      setSettings(savedSettings);
      setUserProfile(savedUserProfile);
      
      // Load stats
      const [characters, books] = await Promise.all([
        CharacterStorageService.getAllCharacters(),
        BookStorageService.getAllBooks()
      ]);
      
      setStats({
        characterCount: characters.length,
        bookCount: books.length,
      });
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isProviderConfigured = () => {
    if (!settings) return false;
    
    if (settings.provider === 'openrouter') {
      return !!(settings.providerSettings?.openrouter?.apiKey);
    } else if (settings.provider === 'ollama') {
      return !!(settings.providerSettings?.ollama?.host && settings.providerSettings?.ollama?.port);
    }
    
    return false;
  };

  const getProviderMessage = () => {
    if (!settings) {
      return "No provider configured. Please set up an AI provider to get started.";
    }
    
    if (settings.provider === 'openrouter' && !settings.providerSettings?.openrouter?.apiKey) {
      return "OpenRouter API key missing. Please configure your API key in settings.";
    } else if (settings.provider === 'ollama' && (!settings.providerSettings?.ollama?.host || !settings.providerSettings?.ollama?.port)) {
      return "Ollama connection not configured. Please set up host and port in settings.";
    }
    
    return null;
  };

  const menuItems = [
    {
      title: 'Character Chats',
      subtitle: `${stats.characterCount} characters available`,
      icon: 'account-group',
      color: BookColors.secondary,
      route: 'Characters',
      description: 'Chat with AI characters using imported character cards'
    },
    {
      title: 'Interactive Books',
      subtitle: `${stats.bookCount} books available`,
      icon: 'book-multiple',
      color: BookColors.primary,
      route: 'Books',
      description: 'Experience AI-driven interactive storytelling'
    },
    {
      title: 'Settings',
      subtitle: 'Configure AI providers',
      icon: 'cog',
      color: BookColors.accent,
      route: 'Settings',
      description: 'Set up OpenRouter, Ollama, and app preferences'
    }
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header with Logo */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/splash-icon.png')} 
              style={styles.logo}
            />
            <View style={styles.titleContainer}>
              <Title style={styles.appTitle}>TinyTavern</Title>
              <Paragraph style={styles.appSubtitle}>
                AI Character Chat & Interactive Stories
              </Paragraph>
            </View>
          </View>
        </View>

        {/* User Profile Warning */}
        {!userProfile?.name && (
          <Card style={[styles.card, styles.profileWarningCard]}>
            <Card.Content>
              <View style={styles.warningHeader}>
                <Avatar.Icon
                  size={40}
                  icon="account-alert"
                  style={styles.profileWarningIcon}
                />
                <View style={styles.warningTextContainer}>
                  <Title style={styles.profileWarningTitle}>Profile Setup Recommended</Title>
                  <Paragraph style={styles.profileWarningText}>
                    Set your name in your profile for a better reading experience. 
                    Stories and characters will be personalized with your name!
                  </Paragraph>
                </View>
              </View>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('Profile')}
                style={styles.profileSetupButton}
                icon="account"
              >
                Set Up Profile
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Provider Warning */}
        {!isProviderConfigured() && (
          <Card style={[styles.card, styles.warningCard]}>
            <Card.Content>
              <View style={styles.warningHeader}>
                <Avatar.Icon
                  size={40}
                  icon="alert-circle"
                  style={styles.warningIcon}
                />
                <View style={styles.warningTextContainer}>
                  <Title style={styles.warningTitle}>Setup Required</Title>
                  <Paragraph style={styles.warningText}>
                    {getProviderMessage()}
                  </Paragraph>
                </View>
              </View>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Settings')}
                style={styles.setupButton}
                icon="cog"
              >
                Configure Provider
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Welcome Message */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.welcomeTitle}>Welcome to TinyTavern!</Title>
            <Paragraph style={styles.welcomeText}>
              Your portable companion for AI character interactions and interactive storytelling. 
              Import character cards, create custom stories, and enjoy AI-powered conversations 
              on the go.
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Main Menu */}
        <View style={styles.menuContainer}>
          <Title style={styles.menuTitle}>Choose Your Adventure</Title>
          
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => navigation.navigate(item.route)}
              disabled={!isProviderConfigured() && item.route !== 'Settings'}
            >
              <Surface style={[
                styles.menuItem,
                (!isProviderConfigured() && item.route !== 'Settings') && styles.disabledMenuItem
              ]}>
                <View style={styles.menuItemContent}>
                  <View style={styles.menuItemLeft}>
                    <Avatar.Icon
                      size={60}
                      icon={item.icon}
                      style={[styles.menuIcon, { backgroundColor: item.color }]}
                    />
                    <View style={styles.menuItemText}>
                      <Title style={styles.menuItemTitle}>{item.title}</Title>
                      <Paragraph style={styles.menuItemSubtitle}>
                        {item.subtitle}
                      </Paragraph>
                      <Paragraph style={styles.menuItemDescription}>
                        {item.description}
                      </Paragraph>
                    </View>
                  </View>
                  <IconButton
                    icon="chevron-right"
                    size={24}
                    iconColor="#666"
                  />
                </View>
              </Surface>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        {isProviderConfigured() && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.quickActionsTitle}>Quick Actions</Title>
              <View style={styles.quickActions}>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('Characters')}
                  style={styles.quickActionButton}
                  icon="account-plus"
                >
                  Add Character
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('Books')}
                  style={styles.quickActionButton}
                  icon="book-plus"
                >
                  Create Book
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('Profile')}
                  style={styles.quickActionButton}
                  icon="account"
                >
                  Profile
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* App Info */}
        <Card style={[styles.card, styles.infoCard]}>
          <Card.Content>
            <View style={styles.infoContent}>
              <Avatar.Icon
                size={32}
                icon="information"
                style={styles.infoIcon}
              />
              <View style={styles.infoText}>
                <Paragraph style={styles.infoDescription}>
                  TinyTavern is free and open source. Import character cards from 
                  Character Tavern, SillyTavern, or create your own interactive stories.
                </Paragraph>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BookColors.background,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: BookColors.surface,
    borderRadius: 20,
    padding: 24,
    elevation: 6,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: BookColors.primaryLight,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 25,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: BookColors.primary,
    elevation: 4,
    shadowColor: BookColors.cardShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  titleContainer: {
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 38,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 12,
    textShadowColor: BookColors.shadow,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  appSubtitle: {
    fontSize: 18,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 26,
    fontStyle: 'italic',
  },
  card: {
    marginBottom: 20,
    backgroundColor: BookColors.surface,
    borderRadius: 16,
    elevation: 5,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: BookColors.primaryLight,
  },
  profileWarningCard: {
    borderLeftWidth: 6,
    borderLeftColor: BookColors.info,
    backgroundColor: '#E3F2FD',
    borderColor: BookColors.info,
    marginBottom: 12,
  },
  profileWarningIcon: {
    backgroundColor: BookColors.info,
    marginRight: 16,
  },
  profileWarningTitle: {
    fontSize: 18,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.info,
    marginBottom: 6,
  },
  profileWarningText: {
    color: '#1565C0',
    lineHeight: 22,
    fontFamily: BookTypography.serif,
    fontSize: 15,
  },
  profileSetupButton: {
    borderColor: BookColors.info,
    borderRadius: 10,
  },
  warningCard: {
    borderLeftWidth: 6,
    borderLeftColor: BookColors.warning,
    backgroundColor: BookColors.parchment,
    borderColor: BookColors.warning,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  warningIcon: {
    backgroundColor: BookColors.warning,
    marginRight: 16,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 20,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.leather,
    marginBottom: 6,
  },
  warningText: {
    color: BookColors.secondary,
    lineHeight: 22,
    fontFamily: BookTypography.serif,
    fontSize: 16,
  },
  setupButton: {
    backgroundColor: BookColors.warning,
    borderRadius: 10,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 28,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 16,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 18,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    lineHeight: 28,
    textAlign: 'center',
  },
  menuContainer: {
    marginBottom: 20,
  },
  menuTitle: {
    fontSize: 24,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 20,
    textAlign: 'center',
  },
  menuItem: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    backgroundColor: BookColors.surface,
    borderWidth: 1,
    borderColor: BookColors.primaryLight,
  },
  disabledMenuItem: {
    opacity: 0.6,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    marginRight: 20,
    elevation: 2,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 20,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 6,
  },
  menuItemSubtitle: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    marginBottom: 6,
  },
  menuItemDescription: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  quickActionsTitle: {
    fontSize: 22,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 20,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    borderColor: BookColors.primary,
    borderRadius: 10,
  },
  infoCard: {
    backgroundColor: BookColors.parchment,
    borderLeftWidth: 6,
    borderLeftColor: BookColors.primary,
    borderColor: BookColors.primary,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    backgroundColor: BookColors.primary,
    marginRight: 16,
  },
  infoText: {
    flex: 1,
  },
  infoDescription: {
    color: BookColors.secondary,
    lineHeight: 24,
    fontFamily: BookTypography.serif,
    fontSize: 16,
  },
});