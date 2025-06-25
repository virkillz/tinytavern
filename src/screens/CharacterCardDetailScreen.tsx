import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Title,
  Paragraph,
  Card,
  Button,
  Avatar,
  IconButton,
  Surface,
  Chip,
  Divider,
} from 'react-native-paper';
import { CharacterCardsBrowserService } from '../services/characterCardsBrowser';
import { CharacterStorageService } from '../services/characterStorage';
import { BookStorageService } from '../services/bookStorage';
import { ServerCharacterCard, StoredCharacter } from '../types';
import { BookColors, BookTypography } from '../styles/theme';

interface Props {
  navigation: any;
  route: {
    params: {
      serverCharacter: ServerCharacterCard;
      onImport?: () => void;
    };
  };
}

const { width: screenWidth } = Dimensions.get('window');

export const CharacterCardDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { serverCharacter, onImport } = route.params;
  const [importing, setImporting] = useState(false);
  
  const characterCard = CharacterCardsBrowserService.parseCharacterMetadata(serverCharacter.metadata);

  const showImportChoice = () => {
    Alert.alert(
      'Import As',
      `Choose how you want to import "${serverCharacter.name}"`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Story Book',
          onPress: () => importAsBook(),
        },
        {
          text: 'Character',
          onPress: () => importAsCharacter(),
        },
      ]
    );
  };

  const importAsCharacter = async () => {
    try {
      setImporting(true);

      const storedCharacter = CharacterCardsBrowserService.convertServerCharacterToStored(serverCharacter);
      
      if (!storedCharacter) {
        Alert.alert('Error', 'Failed to parse character data');
        return;
      }

      const uniqueId = `imported_${Date.now()}_${serverCharacter.id}`;
      const characterToSave: StoredCharacter = {
        ...storedCharacter,
        id: uniqueId,
      };

      await CharacterStorageService.saveCharacter(characterToSave);
      
      Alert.alert(
        'Success',
        `${serverCharacter.name} has been imported as a character!`,
        [
          {
            text: 'View in Library',
            onPress: () => {
              navigation.navigate('Characters');
            },
          },
          {
            text: 'Start Chatting',
            onPress: () => {
              navigation.navigate('CharacterDetail', { characterId: uniqueId });
            },
          },
          { text: 'OK' },
        ]
      );

      if (onImport) {
        onImport();
      }
    } catch (error) {
      console.error('Error importing character:', error);
      Alert.alert('Error', 'Failed to import character. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const importAsBook = async () => {
    try {
      setImporting(true);

      const storedBook = CharacterCardsBrowserService.convertServerCharacterToBook(serverCharacter);
      
      if (!storedBook) {
        Alert.alert('Error', 'Failed to parse character data for book conversion');
        return;
      }

      const createdBook = await BookStorageService.createBook({
        title: storedBook.title,
        card: storedBook.card,
        cover: storedBook.cover,
      });
      
      Alert.alert(
        'Success',
        `${serverCharacter.name} has been imported as a story book!`,
        [
          {
            text: 'View in Library',
            onPress: () => {
              navigation.navigate('Books');
            },
          },
          {
            text: 'Start Reading',
            onPress: () => {
              navigation.navigate('BookDetail', { bookId: createdBook.id });
            },
          },
          { text: 'OK' },
        ]
      );

      if (onImport) {
        onImport();
      }
    } catch (error) {
      console.error('Error importing as book:', error);
      Alert.alert('Error', 'Failed to import as story book. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  if (!characterCard) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            iconColor={BookColors.onSurface}
            onPress={() => navigation.goBack()}
          />
          <Title style={styles.headerTitle}>Character Details</Title>
        </View>
        <View style={styles.errorContainer}>
          <Avatar.Icon size={64} icon="alert-circle" style={styles.errorIcon} />
          <Title style={styles.errorTitle}>Failed to Load Character</Title>
          <Paragraph style={styles.errorText}>
            Unable to parse character data. The character card may be corrupted.
          </Paragraph>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconButton
            icon="arrow-left"
            size={24}
            iconColor={BookColors.onSurface}
            onPress={() => navigation.goBack()}
          />
          <Title style={styles.headerTitle}>Character Details</Title>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Character Header */}
          <Card style={styles.headerCard}>
            <Card.Content style={styles.headerContent}>
              <View style={styles.characterHeader}>
                <View style={styles.avatarContainer}>
                  {serverCharacter.image ? (
                    <Image
                      source={{ uri: CharacterCardsBrowserService.getImageUrl(serverCharacter.image) }}
                      style={styles.characterAvatar}
                    />
                  ) : (
                    <Avatar.Icon size={100} icon="account" style={styles.avatarPlaceholder} />
                  )}
                </View>
                
                <View style={styles.characterMainInfo}>
                  <Title style={styles.characterName}>
                    {characterCard.data.name}
                  </Title>
                  {characterCard.data.creator && (
                    <Paragraph style={styles.creatorText}>
                      Created by {characterCard.data.creator}
                    </Paragraph>
                  )}
                  {characterCard.data.tags && characterCard.data.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {characterCard.data.tags.map((tag, index) => (
                        <Chip key={index} style={styles.tag} textStyle={styles.tagText}>
                          {tag}
                        </Chip>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Import Button */}
          <Surface style={styles.importSection}>
            <Button
              mode="contained"
              onPress={showImportChoice}
              disabled={importing}
              loading={importing}
              style={styles.importButton}
              labelStyle={styles.importButtonLabel}
              icon="download"
            >
              {importing ? 'Importing...' : 'Import to Library'}
            </Button>
          </Surface>

          {/* Character Description */}
          {characterCard.data.description && (
            <Card style={styles.sectionCard}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Description</Title>
                <Paragraph style={styles.descriptionText}>
                  {characterCard.data.description}
                </Paragraph>
              </Card.Content>
            </Card>
          )}

          {/* Character Personality */}
          {characterCard.data.personality && (
            <Card style={styles.sectionCard}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Personality</Title>
                <Paragraph style={styles.contentText}>
                  {characterCard.data.personality}
                </Paragraph>
              </Card.Content>
            </Card>
          )}

          {/* Scenario */}
          {characterCard.data.scenario && (
            <Card style={styles.sectionCard}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Scenario</Title>
                <Paragraph style={styles.contentText}>
                  {characterCard.data.scenario}
                </Paragraph>
              </Card.Content>
            </Card>
          )}

          {/* First Message */}
          {characterCard.data.first_mes && (
            <Card style={styles.sectionCard}>
              <Card.Content>
                <Title style={styles.sectionTitle}>First Message</Title>
                <Surface style={styles.messageContainer}>
                  <Paragraph style={styles.messageText}>
                    {characterCard.data.first_mes}
                  </Paragraph>
                </Surface>
              </Card.Content>
            </Card>
          )}

          {/* Example Messages */}
          {characterCard.data.mes_example && (
            <Card style={styles.sectionCard}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Example Messages</Title>
                <Surface style={styles.messageContainer}>
                  <Paragraph style={styles.messageText}>
                    {characterCard.data.mes_example}
                  </Paragraph>
                </Surface>
              </Card.Content>
            </Card>
          )}

          {/* Creator Notes */}
          {characterCard.data.creator_notes && (
            <Card style={styles.sectionCard}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Creator Notes</Title>
                <Paragraph style={styles.contentText}>
                  {characterCard.data.creator_notes}
                </Paragraph>
              </Card.Content>
            </Card>
          )}

          {/* Character Stats */}
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Character Information</Title>
              <View style={styles.statsContainer}>
                <View style={styles.statRow}>
                  <Title style={styles.statLabel}>Server ID:</Title>
                  <Paragraph style={styles.statValue}>{serverCharacter.id}</Paragraph>
                </View>
                {characterCard.data.talkativeness !== undefined && (
                  <View style={styles.statRow}>
                    <Title style={styles.statLabel}>Talkativeness:</Title>
                    <Paragraph style={styles.statValue}>{characterCard.data.talkativeness}</Paragraph>
                  </View>
                )}
                {characterCard.data.character_version && (
                  <View style={styles.statRow}>
                    <Title style={styles.statLabel}>Version:</Title>
                    <Paragraph style={styles.statValue}>{characterCard.data.character_version}</Paragraph>
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: BookColors.surface,
    elevation: 2,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    backgroundColor: BookColors.warning,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  backButton: {
    borderColor: BookColors.primary,
    borderRadius: 8,
  },
  headerCard: {
    backgroundColor: BookColors.surface,
    borderRadius: 16,
    elevation: 4,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: BookColors.primaryLight,
    marginBottom: 20,
  },
  headerContent: {
    padding: 20,
  },
  characterHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: 20,
  },
  characterAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: BookColors.primaryLight,
  },
  characterMainInfo: {
    flex: 1,
  },
  characterName: {
    fontSize: 24,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 8,
  },
  creatorText: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: BookColors.primaryLight,
    height: 32,
  },
  tagText: {
    fontSize: 12,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurface,
  },
  importSection: {
    backgroundColor: BookColors.surfaceVariant,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  importButton: {
    backgroundColor: BookColors.primary,
    borderRadius: 10,
    paddingVertical: 4,
  },
  importButtonLabel: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: BookColors.surface,
    borderRadius: 12,
    elevation: 2,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: BookColors.primaryLight,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurface,
    lineHeight: 24,
  },
  contentText: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    lineHeight: 22,
  },
  messageContainer: {
    backgroundColor: BookColors.surfaceVariant,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: BookColors.primary,
  },
  messageText: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurface,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  statsContainer: {
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    fontWeight: '600',
    color: BookColors.onSurface,
  },
  statValue: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
  },
});