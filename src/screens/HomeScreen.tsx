import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  FlatList,
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
import { AppSettings, StoredCharacter, StoredBook } from '../types';
import { BookColors, BookTypography } from '../styles/theme';

interface Props {
  navigation: any;
}

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string; avatar?: string } | null>(null);
  const [characters, setCharacters] = useState<StoredCharacter[]>([]);
  const [books, setBooks] = useState<StoredBook[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load settings, user profile, characters, and books
      const [savedSettings, savedUserProfile, allCharacters, allBooks] = await Promise.all([
        StorageService.getSettings(),
        StorageService.getUserProfile(),
        CharacterStorageService.getAllCharacters(),
        BookStorageService.getAllBooks()
      ]);
      
      setSettings(savedSettings);
      setUserProfile(savedUserProfile);
      setCharacters(allCharacters.slice(0, 5)); // Limit to 5 characters
      setBooks(allBooks.slice(0, 5)); // Limit to 5 books
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
      return !!(settings.providerSettings?.ollama?.host);
    }
    
    return false;
  };

  const getProviderMessage = () => {
    if (!settings) {
      return "No provider configured. Please set up an AI provider to get started.";
    }
    
    if (settings.provider === 'openrouter' && !settings.providerSettings?.openrouter?.apiKey) {
      return "OpenRouter API key missing. Please configure your API key in settings.";
    } else if (settings.provider === 'ollama' && !settings.providerSettings?.ollama?.host) {
      return "Ollama connection not configured. Please set up host in settings.";
    }
    
    return null;
  };

  const selectCharacter = async (character: StoredCharacter) => {
    try {
      const settings = await StorageService.getSettings();
      if (settings) {
        await StorageService.saveSettings({
          ...settings,
          selectedCharacter: character.id,
        });
      }
      navigation.navigate('Chat');
    } catch (error) {
      console.error('Error selecting character:', error);
    }
  };

  const selectBook = async (book: StoredBook) => {
    try {
      const settings = await StorageService.getSettings();
      if (settings) {
        await StorageService.saveSettings({
          ...settings,
          selectedBook: book.id,
        });
      }
      navigation.navigate('BookChat');
    } catch (error) {
      console.error('Error selecting book:', error);
    }
  };

  const renderCharacterCard = ({ item }: { item: StoredCharacter }) => (
    <TouchableOpacity
      style={styles.horizontalCard}
      onPress={() => selectCharacter(item)}
    >
      <Card style={styles.characterCard}>
        <Card.Content style={styles.horizontalCardContent}>
          {item.avatar ? (
            <Image
              source={item.avatar === 'default_asset' 
                ? require('../../assets/default.png') 
                : { uri: item.avatar }}
              style={styles.characterAvatar}
            />
          ) : (
            <Avatar.Icon size={60} icon="account" style={styles.characterAvatarPlaceholder} />
          )}
          <View style={styles.characterInfo}>
            <Title style={styles.characterName} numberOfLines={1}>
              {item.name}
            </Title>
            <Paragraph style={styles.characterDescription} numberOfLines={2}>
              {item.card.data.description}
            </Paragraph>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderBookCard = ({ item }: { item: StoredBook }) => (
    <TouchableOpacity
      style={styles.portraitCard}
      onPress={() => selectBook(item)}
    >
      <Card style={styles.bookCard}>
        <Card.Content style={styles.portraitCardContent}>
          {/* Book Cover */}
          <View style={styles.bookCoverContainer}>
            {item.cover ? (
              <Image
                source={item.cover === 'default_book_asset' 
                  ? require('../../assets/default.png') 
                  : { uri: item.cover }}
                style={styles.bookCoverPortrait}
              />
            ) : (
              <View style={styles.bookCoverPlaceholderPortrait}>
                <Avatar.Icon size={60} icon="book" style={styles.bookCoverIcon} />
              </View>
            )}
          </View>
          
          {/* Book Info */}
          <View style={styles.bookInfoPortrait}>
            <Title style={styles.bookTitlePortrait} numberOfLines={2}>
              {item.title}
            </Title>
            <Paragraph style={styles.bookAuthorPortrait} numberOfLines={1}>
              by {item.card.data.author}
            </Paragraph>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );



  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Navigation Bar */}
      <View style={styles.topNavBar}>
        <View style={styles.topNavLeft}>
          <Image 
            source={require('../../assets/icon.png')} 
            style={styles.topNavLogo}
          />
          <Title style={styles.topNavTitle}>Tiny Tavern</Title>
        </View>
        <IconButton
          icon="cog"
          size={24}
          iconColor={BookColors.onSurface}
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsButton}
        />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Dynamic Greeting */}
        <View style={styles.greetingSection}>
          <Title style={styles.greetingTitle}>
            {userProfile?.name ? `Welcome Back, ${userProfile.name}!` : 'Welcome, Adventurer!'}
          </Title>
          <Paragraph style={styles.greetingSubtitle}>
            Ready for your next adventure?
          </Paragraph>
        </View>

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

        {/* Chat with AI Characters Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Chat with AI Characters</Title>
            <TouchableOpacity onPress={() => navigation.navigate('Characters')}>
              <Paragraph style={styles.seeAllText}>See All</Paragraph>
            </TouchableOpacity>
          </View>
          
          {characters.length > 0 ? (
            <FlatList
              data={characters}
              renderItem={renderCharacterCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <Avatar.Icon size={48} icon="account-plus" style={styles.emptyIcon} />
                <Paragraph style={styles.emptyText}>No characters yet</Paragraph>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('Characters')}
                  style={styles.emptyButton}
                >
                  Create or Import Character
                </Button>
              </Card.Content>
            </Card>
          )}
        </View>

        {/* Read Interactive Books Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Read Interactive Books</Title>
            <TouchableOpacity onPress={() => navigation.navigate('Books')}>
              <Paragraph style={styles.seeAllText}>See All</Paragraph>
            </TouchableOpacity>
          </View>
          
          {books.length > 0 ? (
            <FlatList
              data={books}
              renderItem={renderBookCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <Avatar.Icon size={48} icon="book-plus" style={styles.emptyIcon} />
                <Paragraph style={styles.emptyText}>No books yet</Paragraph>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('Books')}
                  style={styles.emptyButton}
                >
                  Create or Import Book
                </Button>
              </Card.Content>
            </Card>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Quick Actions</Title>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('CharacterEdit', { characterId: null })}
            >
              <Card style={styles.actionCard}>
                <Card.Content style={styles.actionCardContent}>
                  <Avatar.Icon size={40} icon="account-plus" style={styles.actionIcon} />
                  <Title style={styles.actionTitle}>Create Character</Title>
                  <Paragraph style={styles.actionDescription}>Design your own AI character</Paragraph>
                </Card.Content>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Characters')}
            >
              <Card style={styles.actionCard}>
                <Card.Content style={styles.actionCardContent}>
                  <Avatar.Icon size={40} icon="upload" style={styles.actionIcon} />
                  <Title style={styles.actionTitle}>Import Character</Title>
                  <Paragraph style={styles.actionDescription}>Import from character card files</Paragraph>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BookColors.background,
  },
  topNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BookColors.surface,
    elevation: 4,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: BookColors.primaryLight,
  },
  topNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topNavLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 8,
  },
  topNavTitle: {
    fontSize: 20,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
  },
  settingsButton: {
    margin: 0,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  greetingSection: {
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
  greetingTitle: {
    fontSize: 28,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 8,
    textAlign: 'center',
  },
  greetingSubtitle: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    color: BookColors.primary,
    fontWeight: '600',
  },
  horizontalList: {
    paddingRight: 20,
  },
  horizontalCard: {
    marginRight: 16,
    width: 280,
  },
  portraitCard: {
    marginRight: 16,
    width: 160,
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
  // Character Card Styles
  characterCard: {
    backgroundColor: BookColors.surface,
    borderRadius: 16,
    elevation: 4,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: BookColors.primaryLight,
  },
  horizontalCardContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  portraitCardContent: {
    padding: 16,
    alignItems: 'center',
  },
  characterAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  characterAvatarPlaceholder: {
    backgroundColor: BookColors.primaryLight,
    marginRight: 12,
  },
  characterInfo: {
    flex: 1,
  },
  characterName: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 4,
  },
  characterDescription: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    lineHeight: 20,
  },
  // Book Card Styles
  bookCard: {
    backgroundColor: BookColors.surface,
    borderRadius: 16,
    elevation: 4,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: BookColors.primaryLight,
  },
  bookCover: {
    width: 50,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
  },
  bookCoverPlaceholder: {
    backgroundColor: BookColors.primaryLight,
    marginRight: 12,
    width: 50,
    height: 70,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 2,
  },
  bookAuthor: {
    fontSize: 12,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    marginBottom: 2,
  },
  bookDescription: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    lineHeight: 10,
  },
  // Portrait Book Card Styles
  bookCoverContainer: {
    alignItems: 'center',
    marginBottom: 2,
  },
  bookCoverPortrait: {
    width: 120,
    height: 160,
    borderRadius: 2,
    elevation: 3,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  bookCoverPlaceholderPortrait: {
    width: 120,
    height: 160,
    borderRadius: 12,
    backgroundColor: BookColors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: BookColors.primaryLight,
    borderStyle: 'dashed',
  },
  bookCoverIcon: {
    backgroundColor: BookColors.primaryLight,
  },
  bookInfoPortrait: {
    alignItems: 'center',
    width: '100%',
  },
  bookTitlePortrait: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 4,
    textAlign: 'center',
    lineHeight: 22,
  },
  bookAuthorPortrait: {
    fontSize: 12,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    marginBottom: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bookDescriptionPortrait: {
    fontSize: 13,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    lineHeight: 18,
    textAlign: 'center',
  },
  // Empty State Styles
  emptyCard: {
    backgroundColor: BookColors.surfaceVariant,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: BookColors.primaryLight,
    borderStyle: 'dashed',
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    backgroundColor: BookColors.primaryLight,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyButton: {
    borderColor: BookColors.primary,
    borderRadius: 10,
  },
  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  quickActionCard: {
    flex: 1,
  },
  actionCard: {
    backgroundColor: BookColors.surface,
    borderRadius: 16,
    elevation: 4,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: BookColors.primaryLight,
  },
  actionCardContent: {
    alignItems: 'center',
    padding: 20,
  },
  actionIcon: {
    backgroundColor: BookColors.primary,
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 8,
    textAlign: 'center',
  },
  actionDescription: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
});