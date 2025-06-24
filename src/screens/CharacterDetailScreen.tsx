import React, { useState, useEffect } from 'react';
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
} from 'react-native-paper';
import { CharacterStorageService } from '../services/characterStorage';
import { StoredCharacter } from '../types';

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
  const { characterId } = route.params;

  useEffect(() => {
    loadCharacter();
  }, [characterId]);

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
        <View style={styles.headerActions}>
          <IconButton
            icon="pencil"
            size={24}
            onPress={() => navigation.navigate('CharacterEdit', { characterId: character.id })}
          />
          <IconButton
            icon="delete"
            size={24}
            onPress={deleteCharacter}
          />
        </View>
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
                  <Paragraph style={styles.creator}>by {character.card.data.creator}</Paragraph>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
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
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#ccc',
    marginRight: 16,
  },
  nameSection: {
    flex: 1,
  },
  characterName: {
    fontSize: 24,
    marginBottom: 4,
  },
  creator: {
    color: '#666',
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
  personality: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
  scenario: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
  firstMessage: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
    fontStyle: 'italic',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
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
});