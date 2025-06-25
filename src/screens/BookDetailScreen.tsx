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
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { BookStorageService } from '../services/bookStorage';
import { StoredBook } from '../types';

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
        <View style={styles.headerActions}>
          <IconButton
            icon="pencil"
            size={24}
            onPress={() => navigation.navigate('BookEdit', { bookId: book.id })}
          />
          <IconButton
            icon="delete"
            size={24}
            onPress={deleteBook}
          />
        </View>
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
                  <Paragraph style={styles.genre}>Genre: {book.card.data.genre}</Paragraph>
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
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  coverImage: {
    width: 120,
    height: 160,
    borderRadius: 8,
    marginRight: 16,
  },
  coverPlaceholder: {
    backgroundColor: '#ccc',
    marginRight: 16,
    width: 120,
    height: 160,
    borderRadius: 8,
  },
  titleSection: {
    flex: 1,
    paddingTop: 8,
  },
  bookTitle: {
    fontSize: 24,
    marginBottom: 8,
    lineHeight: 30,
  },
  author: {
    color: '#666',
    fontSize: 16,
    marginBottom: 4,
  },
  genre: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
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
  summary: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
  scenario: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
  previewCard: {
    backgroundColor: '#f8f8f8',
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  firstPage: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    fontStyle: 'italic',
  },
  creatorNotes: {
    fontSize: 14,
    lineHeight: 20,
    color: '#777',
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
});