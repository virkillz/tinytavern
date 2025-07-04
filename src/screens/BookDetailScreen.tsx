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
import { BookStorageService } from '../services/bookStorage';
import { StoredBook } from '../types';
import { BookColors, BookTypography } from '../styles/theme';

interface Props {
  navigation: any;
  route: {
    params: {
      bookId: string;
    };
  };
}

export const BookDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const [book, setBook] = useState<StoredBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const { bookId } = route.params;

  useEffect(() => {
    loadBook();
  }, [bookId]);

  // Reload book when screen comes back into focus (e.g., after editing)
  useFocusEffect(
    useCallback(() => {
      if (bookId) {
        loadBook();
      }
    }, [bookId])
  );

  const loadBook = async () => {
    try {
      const loadedBook = await BookStorageService.getBookById(bookId);
      setBook(loadedBook);
    } catch (error) {
      console.error('Error loading book:', error);
      Alert.alert('Error', 'Failed to load book', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const deleteBook = async () => {
    if (!book) return;

    Alert.alert(
      'Delete Book',
      `Are you sure you want to delete "${book.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await BookStorageService.deleteBook(book.id);
              Alert.alert('Success', 'Book deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete book');
            }
          },
        },
      ]
    );
  };

  const selectBookAndRead = async () => {
    if (!book) return;

    try {
      // Save selected book to settings
      const { StorageService } = require('../utils/storage');
      const settings = await StorageService.getSettings();
      if (settings) {
        await StorageService.saveSettings({
          ...settings,
          selectedBook: book.id,
        });
      }
      
      navigation.navigate('BookChat');
    } catch (error) {
      Alert.alert('Error', 'Failed to select book');
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
          <Title style={styles.headerTitle}>Book Details</Title>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Paragraph style={styles.loadingText}>Loading book...</Paragraph>
        </View>
      </SafeAreaView>
    );
  }

  if (!book) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <Title style={styles.headerTitle}>Book Details</Title>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.errorContainer}>
          <Paragraph style={styles.errorText}>Book not found</Paragraph>
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
        <Title style={styles.headerTitle}>Book Details</Title>
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
              navigation.navigate('BookEdit', { bookId: book.id });
            }}
            title="Edit"
            leadingIcon="pencil"
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              deleteBook();
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
              {book.cover ? (
                <Image 
                  source={book.cover === 'default_book_asset' 
                    ? require('../../assets/default.png') 
                    : { uri: book.cover }} 
                  style={styles.coverImage} 
                />
              ) : (
                <Avatar.Icon size={120} icon="book" style={styles.coverPlaceholder} />
              )}
              <View style={styles.titleSection}>
                <Title style={styles.bookTitle}>{book.title}</Title>
                <Paragraph style={styles.author}>by {book.card.data.author}</Paragraph>
                {book.card.data.genre && (
                  <View>
                    <Paragraph style={styles.genre}>Genre: {book.card.data.genre}</Paragraph>
                    <Button
                      mode="outlined"
                      onPress={selectBookAndRead}
                      style={styles.readButtonInline}
                      icon="book-open"
                      compact
                    >
                      Read
                    </Button>
                  </View>
                )}
              </View>
            </View>

            {book.card.data.description && (
              <View style={styles.section}>
                <Title style={styles.sectionTitle}>Description</Title>
                <Paragraph style={styles.description}>
                  {book.card.data.description}
                </Paragraph>
              </View>
            )}

            {book.card.data.summary && (
              <View style={styles.section}>
                <Title style={styles.sectionTitle}>Summary</Title>
                <Paragraph style={styles.summary}>
                  {book.card.data.summary}
                </Paragraph>
              </View>
            )}

            {book.card.data.scenario && (
              <View style={styles.section}>
                <Title style={styles.sectionTitle}>Setting</Title>
                <Paragraph style={styles.scenario}>
                  {book.card.data.scenario}
                </Paragraph>
              </View>
            )}

            {book.card.data.first_page && (
              <View style={styles.section}>
                <Title style={styles.sectionTitle}>First Page Preview</Title>
                <Card style={styles.previewCard}>
                  <Card.Content>
                    <Paragraph style={styles.firstPage}>
                      {book.card.data.first_page}
                    </Paragraph>
                  </Card.Content>
                </Card>
              </View>
            )}

            {book.card.data.tags && book.card.data.tags.length > 0 && (
              <View style={styles.section}>
                <Title style={styles.sectionTitle}>Tags</Title>
                <View style={styles.tagsContainer}>
                  {book.card.data.tags.map((tag, index) => (
                    <Chip key={index} style={styles.tag} textStyle={styles.tagText}>
                      {tag}
                    </Chip>
                  ))}
                </View>
              </View>
            )}

            {book.card.data.creator_notes && (
              <View style={styles.section}>
                <Title style={styles.sectionTitle}>Creator Notes</Title>
                <Paragraph style={styles.creatorNotes}>
                  {book.card.data.creator_notes}
                </Paragraph>
              </View>
            )}
          </Card.Content>
        </Card>

        <View style={styles.actionButtons}>
          <Button
            mode="contained"
            onPress={selectBookAndRead}
            style={styles.readButton}
            icon="book-open"
          >
            Start Reading
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
    alignItems: 'flex-start',
    marginBottom: 24,
    padding: 4,
  },
  coverImage: {
    width: 120,
    height: 160,
    borderRadius: 12,
    marginRight: 20,
    elevation: 2,
    borderWidth: 2,
    borderColor: BookColors.primaryLight,
  },
  coverPlaceholder: {
    backgroundColor: BookColors.primaryLight,
    marginRight: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    elevation: 2,
  },
  titleSection: {
    flex: 1,
    paddingTop: 8,
  },
  bookTitle: {
    fontSize: 24,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 8,
    lineHeight: 30,
  },
  author: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    marginBottom: 4,
  },
  genre: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    color: BookColors.accent,
    fontStyle: 'italic',
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
  summary: {
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
  previewCard: {
    backgroundColor: BookColors.parchment,
    borderLeftWidth: 6,
    borderLeftColor: BookColors.primary,
    borderRadius: 12,
    elevation: 2,
  },
  firstPage: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    lineHeight: 24,
    color: BookColors.secondary,
    fontStyle: 'italic',
  },
  creatorNotes: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    lineHeight: 20,
    color: BookColors.accent,
    fontStyle: 'italic',
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
  readButton: {
    paddingVertical: 8,
  },
  readButtonInline: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    width: 'auto',
    alignSelf: 'flex-start',
  },
});