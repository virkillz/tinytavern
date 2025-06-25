import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Title,
  Paragraph,
  Button,
  IconButton,
  Card,
  Chip,
  ActivityIndicator,
  Avatar,
  Menu,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { CharacterStorageService } from '../services/characterStorage';
import { StoredCharacter } from '../types';
import { BookColors, BookTypography } from '../styles/theme';

interface Props {
  navigation: any;
  route: {
    params: {
      characterId: string;
    };
  };
}

export const CharacterDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const [character, setCharacter] = useState<StoredCharacter | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const { characterId } = route.params;

  useEffect(() => {
    loadCharacter();
  }, [characterId]);

  // Reload character when screen comes back into focus (e.g., after editing)
  useFocusEffect(
    useCallback(() => {
      if (characterId) {
        loadCharacter();
      }
    }, [characterId])
  );

  const loadCharacter = async () => {
    try {
      const loadedCharacter = await CharacterStorageService.getCharacterById(characterId);
      setCharacter(loadedCharacter);
    } catch (error) {
      console.error('Error loading character:', error);
      Alert.alert('Error', 'Failed to load character', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const deleteCharacter = async () => {
    if (!character) return;

    Alert.alert(
      'Delete Character',
      `Are you sure you want to delete "${character.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await CharacterStorageService.deleteCharacter(character.id);
              Alert.alert('Success', 'Character deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete character');
            }
          },
        },
      ]
    );
  };

  const selectCharacterAndChat = async () => {
    if (!character) return;

    try {
      // Save selected character to settings
      const { StorageService } = require('../utils/storage');
      const settings = await StorageService.getSettings();
      if (settings) {
        await StorageService.saveSettings({
          ...settings,
          selectedCharacter: character.id,
        });
      }
      
      navigation.navigate('Chat');
    } catch (error) {
      Alert.alert('Error', 'Failed to select character');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <Title style={styles.headerTitle}>Character Details</Title>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Paragraph style={styles.loadingText}>Loading character...</Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  if (!character) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <Title style={styles.headerTitle}>Character Details</Title>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.errorContainer}>
          <Paragraph style={styles.errorText}>Character not found</Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Title style={styles.headerTitle}>Character Details</Title>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              size={24}
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('CharacterEdit', { characterId: character.id });
            }}
            title="Edit"
            leadingIcon="pencil"
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              deleteCharacter();
            }}
            title="Delete"
            leadingIcon="delete"
          />
        </Menu>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.profileCard}>
          <Card.Content>
            <View style={styles.profileHeader}>
              {character.avatar ? (
                <Image 
                  source={character.avatar === 'default_asset' 
                    ? require('../../assets/default.png') 
                    : { uri: character.avatar }} 
                  style={styles.avatar} 
                />
              ) : (
                <Avatar.Icon size={80} icon="account" style={styles.avatarPlaceholder} />
              )}
              <View style={styles.nameSection}>
                <Title style={styles.characterName}>{character.name}</Title>
                {character.card.data.creator && (
                  <View>
                    <Paragraph style={styles.creator}>by {character.card.data.creator}</Paragraph>
                    <Button
                      mode="outlined"
                      onPress={selectCharacterAndChat}
                      style={styles.chatButtonInline}
                      icon="chat"
                      compact
                    >
                      Start Chat
                    </Button>
                  </View>
                )}
              </View>
            </View>

            {character.card.data.description && (
              <View style={styles.section}>
                <Title style={styles.sectionTitle}>Description</Title>
                <Paragraph style={styles.description}>
                  {character.card.data.description}
                </Paragraph>
              </View>
            )}

            {character.card.data.personality && (
              <View style={styles.section}>
                <Title style={styles.sectionTitle}>Personality</Title>
                <Paragraph style={styles.personality}>
                  {character.card.data.personality}
                </Paragraph>
              </View>
            )}

            {character.card.data.scenario && (
              <View style={styles.section}>
                <Title style={styles.sectionTitle}>Scenario</Title>
                <Paragraph style={styles.scenario}>
                  {character.card.data.scenario}
                </Paragraph>
              </View>
            )}

            {character.card.data.first_mes && (
              <View style={styles.section}>
                <Title style={styles.sectionTitle}>First Message</Title>
                <Paragraph style={styles.firstMessage}>
                  {character.card.data.first_mes}
                </Paragraph>
              </View>
            )}

            {character.card.data.tags && character.card.data.tags.length > 0 && (
              <View style={styles.section}>
                <Title style={styles.sectionTitle}>Tags</Title>
                <View style={styles.tagsContainer}>
                  {character.card.data.tags.map((tag, index) => (
                    <Chip key={index} style={styles.tag} textStyle={styles.tagText}>
                      {tag}
                    </Chip>
                  ))}
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        <View style={styles.actionButtons}>
          <Button
            mode="contained"
            onPress={selectCharacterAndChat}
            style={styles.chatButton}
            icon="chat"
          >
            Start Chat
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BookColors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: BookColors.surface,
    elevation: 4,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: BookColors.primaryLight,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 48,
  },
  headerActions: {
    flexDirection: 'row',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  scrollContent: {
    padding: 16,
  },
  profileCard: {
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 4,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20,
    elevation: 2,
    borderWidth: 2,
    borderColor: BookColors.primaryLight,
  },
  avatarPlaceholder: {
    backgroundColor: BookColors.primaryLight,
    marginRight: 20,
    elevation: 2,
  },
  nameSection: {
    flex: 1,
  },
  characterName: {
    fontSize: 24,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 6,
  },
  creator: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    lineHeight: 24,
    color: BookColors.onSurfaceVariant,
  },
  personality: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    lineHeight: 24,
    color: BookColors.onSurfaceVariant,
  },
  scenario: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    lineHeight: 24,
    color: BookColors.onSurfaceVariant,
  },
  firstMessage: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    lineHeight: 24,
    color: BookColors.secondary,
    fontStyle: 'italic',
    backgroundColor: BookColors.parchment,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 6,
    borderLeftColor: BookColors.primary,
    elevation: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
  },
  actionButtons: {
    gap: 12,
  },
  chatButton: {
    paddingVertical: 8,
  },
  chatButtonInline: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    width: 'auto',
  },
});