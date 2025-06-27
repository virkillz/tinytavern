import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
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
} from 'react-native-paper';
import { CharacterCardsBrowserService } from '../services/characterCardsBrowser';
import { CharacterStorageService } from '../services/characterStorage';
import { BookStorageService } from '../services/bookStorage';
import { ServerCharacterCard, StoredCharacter } from '../types';
import { BookColors, BookTypography } from '../styles/theme';

interface Props {
  navigation: any;
}

export const CharacterCardsBrowserScreen: React.FC<Props> = ({ navigation }) => {
  const [characterCards, setCharacterCards] = useState<ServerCharacterCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [importing, setImporting] = useState<{ [key: number]: boolean }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);

  useEffect(() => {
    loadCharacterCards();
  }, [currentPage]);

  const loadCharacterCards = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setCurrentPage(1);
      } else {
        setLoading(true);
      }

      const response = await CharacterCardsBrowserService.fetchCharacterCards(refresh ? 1 : currentPage);
      
      if (response.code === 200) {
        if (refresh || currentPage === 1) {
          setCharacterCards(response.data.entries);
        } else {
          setCharacterCards(prev => [...prev, ...response.data.entries]);
        }
        setTotalPages(response.data.total_pages);
        setTotalEntries(response.data.total_entries);
      } else {
        Alert.alert('Error', 'Failed to load character cards');
      }
    } catch (error) {
      console.error('Error loading character cards:', error);
      Alert.alert('Error', 'Failed to connect to server. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMoreCharacterCards = () => {
    if (currentPage < totalPages && !loading) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const onRefresh = () => {
    loadCharacterCards(true);
  };

  const showImportChoice = (serverCharacter: ServerCharacterCard) => {
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
          onPress: () => importAsBook(serverCharacter),
        },
        {
          text: 'Character',
          onPress: () => importAsCharacter(serverCharacter),
        },
      ]
    );
  };

  const importAsCharacter = async (serverCharacter: ServerCharacterCard) => {
    try {
      setImporting(prev => ({ ...prev, [serverCharacter.id]: true }));

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
            text: 'View Character',
            onPress: () => navigation.navigate('CharacterDetail', { characterId: uniqueId }),
          },
          { text: 'OK' },
        ]
      );
    } catch (error) {
      console.error('Error importing character:', error);
      Alert.alert('Error', 'Failed to import character. Please try again.');
    } finally {
      setImporting(prev => ({ ...prev, [serverCharacter.id]: false }));
    }
  };

  const importAsBook = async (serverCharacter: ServerCharacterCard) => {
    try {
      setImporting(prev => ({ ...prev, [serverCharacter.id]: true }));

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
            text: 'View Book',
            onPress: () => navigation.navigate('BookDetail', { bookId: createdBook.id }),
          },
          { text: 'OK' },
        ]
      );
    } catch (error) {
      console.error('Error importing as book:', error);
      Alert.alert('Error', 'Failed to import as story book. Please try again.');
    } finally {
      setImporting(prev => ({ ...prev, [serverCharacter.id]: false }));
    }
  };

  const viewCharacterDetail = (serverCharacter: ServerCharacterCard) => {
    navigation.navigate('CharacterCardDetail', { 
      serverCharacter,
      onImport: () => showImportChoice(serverCharacter),
    });
  };

  const renderCharacterCard = ({ item }: { item: ServerCharacterCard }) => {
    const characterCard = CharacterCardsBrowserService.parseCharacterMetadata(item.metadata);
    const isImporting = importing[item.id];

    return (
      <TouchableOpacity
        style={styles.cardContainer}
        onPress={() => viewCharacterDetail(item)}
        disabled={isImporting}
      >
        <Card style={styles.characterCard}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.avatarContainer}>
                {item.image ? (
                  <Image
                    source={{ uri: CharacterCardsBrowserService.getImageUrl(item.image) }}
                    style={styles.characterAvatar}
                  />
                ) : (
                  <Avatar.Icon size={60} icon="account" style={styles.avatarPlaceholder} />
                )}
              </View>
              
              <View style={styles.characterInfo}>
                <Title style={styles.characterName} numberOfLines={1}>
                  {item.name}
                </Title>
                {characterCard && (
                  <Paragraph style={styles.characterDescription} numberOfLines={2}>
                    {characterCard.data.description}
                  </Paragraph>
                )}
                {characterCard?.data.creator && (
                  <Paragraph style={styles.creatorText}>
                    by {characterCard.data.creator}
                  </Paragraph>
                )}
              </View>
            </View>

            {characterCard?.data.tags && characterCard.data.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {characterCard.data.tags.slice(0, 3).map((tag, index) => (
                  <Chip key={index} style={styles.tag} textStyle={styles.tagText}>
                    {tag}
                  </Chip>
                ))}
                {characterCard.data.tags.length > 3 && (
                  <Chip style={styles.tag} textStyle={styles.tagText}>
                    +{characterCard.data.tags.length - 3}
                  </Chip>
                )}
              </View>
            )}

            <View style={styles.cardActions}>
              <Button
                mode="outlined"
                onPress={() => viewCharacterDetail(item)}
                style={styles.detailButton}
                labelStyle={styles.buttonLabel}
              >
                View Details
              </Button>
              <Button
                mode="contained"
                onPress={() => showImportChoice(item)}
                disabled={isImporting}
                loading={isImporting}
                style={styles.importButton}
                labelStyle={styles.buttonLabel}
                icon="download"
              >
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (currentPage >= totalPages) return null;
    
    return (
      <View style={styles.footerContainer}>
        <Button
          mode="outlined"
          onPress={loadMoreCharacterCards}
          disabled={loading}
          loading={loading}
          style={styles.loadMoreButton}
        >
          Load More Characters
        </Button>
      </View>
    );
  };

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
          <Title style={styles.headerTitle}>Explore</Title>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <Surface style={styles.statsCard}>
          <Paragraph style={styles.statsText}>
            {totalEntries} characters available • Page {currentPage} of {totalPages}
          </Paragraph>
        </Surface>
      </View>

      {loading && currentPage === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BookColors.primary} />
          <Paragraph style={styles.loadingText}>Loading character cards...</Paragraph>
        </View>
      ) : (
        <FlatList
          data={characterCards}
          renderItem={renderCharacterCard}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[BookColors.primary]}
              tintColor={BookColors.primary}
            />
          }
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  statsContainer: {
    padding: 16,
  },
  statsCard: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: BookColors.surfaceVariant,
  },
  statsText: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  cardContainer: {
    marginBottom: 16,
  },
  characterCard: {
    backgroundColor: BookColors.surface,
    borderRadius: 16,
    elevation: 3,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: BookColors.primaryLight,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 16,
  },
  characterAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    backgroundColor: BookColors.primaryLight,
  },
  characterInfo: {
    flex: 1,
  },
  characterName: {
    fontSize: 18,
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
    marginBottom: 4,
  },
  creatorText: {
    fontSize: 12,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  tag: {
    backgroundColor: BookColors.primaryLight,
    height: 28,
  },
  tagText: {
    fontSize: 12,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurface,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailButton: {
    flex: 1,
    borderColor: BookColors.primary,
    borderRadius: 8,
  },
  importButton: {
    flex: 1,
    backgroundColor: BookColors.primary,
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    fontWeight: '600',
  },
  footerContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    borderColor: BookColors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
  },
});