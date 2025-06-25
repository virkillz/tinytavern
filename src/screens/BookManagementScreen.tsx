import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Title,
  Paragraph,
  IconButton,
  Card,
  Button,
  ActivityIndicator,
  Avatar,
  TextInput,
  Chip,
} from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { BookStorageService } from '../services/bookStorage';
import { CharacterCardService } from '../services/characterCard';
import { PNGDebugger } from '../utils/debugPNG';
import { StoredBook } from '../types';
import { BookColors, BookTypography } from '../styles/theme';

interface Props {
  navigation: any;
}

export const BookManagementScreen: React.FC<Props> = ({ navigation }) => {
  const [books, setBooks] = useState<StoredBook[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<StoredBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [])
  );

  // Filter books based on search query and selected tags
  useEffect(() => {
    let filtered = books;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.card.data.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(book =>
        book.card.data.tags?.some(tag => selectedTags.includes(tag))
      );
    }

    setFilteredBooks(filtered);
  }, [books, searchQuery, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  const loadBooks = async () => {
    try {
      const storedBooks = await BookStorageService.getAllBooks();
      setBooks(storedBooks);
      setFilteredBooks(storedBooks);
      
      // Extract all unique tags
      const tags = new Set<string>();
      storedBooks.forEach(book => {
        if (book.card.data.tags) {
          book.card.data.tags.forEach(tag => tags.add(tag));
        }
      });
      setAllTags(Array.from(tags).sort());
    } catch (error) {
      console.error('Error loading books:', error);
      Alert.alert('Error', 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const importBookCard = async () => {
    try {
      setImporting(true);

      // Pick PNG file from file system
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/png',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const imageUri = result.assets[0].uri;
      
      // Debug the PNG file first
      console.log('🔧 Debugging PNG file for book import...');
      await PNGDebugger.debugPNGFile(imageUri);
      
      // Extract character card from PNG (which will be converted to book)
      const characterCard = await CharacterCardService.extractCharacterFromPNG(imageUri);
      
      if (!characterCard) {
        Alert.alert(
          'Invalid File', 
          'This PNG file does not contain valid character card metadata that can be converted to a book. Check the console for detailed debug information.',
          [
            { 
              text: 'Debug Info', 
              onPress: () => {
                Alert.alert(
                  'Debug Instructions',
                  'Open your browser/app console (F12) to see detailed PNG analysis. Look for logs starting with 🔍 PNG DEBUG.'
                );
              }
            },
            { text: 'OK' }
          ]
        );
        return;
      }

      if (!CharacterCardService.validateCharacterCard(characterCard)) {
        Alert.alert('Invalid Character Card', 'The character card data is incomplete or invalid for book conversion.');
        return;
      }

      // Import character card as book
      const importedBook = await BookStorageService.importBookFromCharacterPNG(imageUri, characterCard);
      
      Alert.alert(
        'Success', 
        `Character "${characterCard.data.name}" has been successfully converted to interactive book "${importedBook.title}"!`,
        [
          {
            text: 'View Book',
            onPress: () => navigation.navigate('BookDetail', { bookId: importedBook.id })
          },
          { text: 'OK' }
        ]
      );
      await loadBooks();
      
    } catch (error) {
      console.error('Error importing book from character card:', error);
      Alert.alert('Error', 'Failed to import character card as book. Make sure the PNG contains valid character card data.');
    } finally {
      setImporting(false);
    }
  };

  const deleteBook = async (book: StoredBook) => {
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
              await loadBooks();
              Alert.alert('Success', 'Book deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete book');
            }
          },
        },
      ]
    );
  };

  const selectBook = async (book: StoredBook) => {
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
      
      Alert.alert('Book Selected', `"${book.title}" is now active for reading!`, [
        { text: 'OK', onPress: () => navigation.navigate('BookChat') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to select book');
    }
  };

  const renderBookCard = ({ item }: { item: StoredBook }) => (
    <Card style={styles.bookCard}>
      <TouchableOpacity onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}>
        <View style={styles.cardContent}>
          {item.cover ? (
            <Image 
              source={item.cover === 'default_book_asset' 
                ? require('../../assets/default.png') // Using default image for now
                : { uri: item.cover }} 
              style={styles.coverImage} 
            />
          ) : (
            <Avatar.Icon size={60} icon="book" style={styles.coverPlaceholder} />
          )}
          <View style={styles.bookInfo}>
            <Title style={styles.bookTitle}>{item.title}</Title>
            <Paragraph style={styles.bookAuthor}>by {item.card.data.author}</Paragraph>
            <Paragraph style={styles.bookDescription} numberOfLines={2}>
              {item.card.data.description}
            </Paragraph>
            {item.card.data.genre && (
              <Paragraph style={styles.bookGenre}>Genre: {item.card.data.genre}</Paragraph>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );

  const createNewBook = () => {
    navigation.navigate('BookEdit', { bookId: null });
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
          <Title style={styles.headerTitle}>Interactive Books</Title>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Paragraph style={styles.loadingText}>Loading books...</Paragraph>
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
          onPress={() => navigation.navigate('Home')}
        />
        <Title style={styles.headerTitle}>Interactive Books</Title>
        <View style={styles.headerActions}>
          <IconButton
            icon="upload"
            size={24}
            onPress={importBookCard}
            disabled={importing}
          />
          <IconButton
            icon="plus"
            size={24}
            onPress={createNewBook}
          />
        </View>
      </View>

      {books.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Paragraph style={styles.emptyText}>No books yet!</Paragraph>
          <Paragraph style={styles.emptySubtext}>
            Import book cards or create new interactive stories to get started.
          </Paragraph>
          <View style={styles.emptyActions}>
            <Button
              mode="contained"
              onPress={importBookCard}
              loading={importing}
              disabled={importing}
              style={styles.emptyButton}
            >
              Import Character Card as Book
            </Button>
            <Button
              mode="outlined"
              onPress={createNewBook}
              style={styles.emptyButton}
            >
              Create New Book
            </Button>
          </View>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {/* Search Bar */}
          <TextInput
            label="Search books"
            value={searchQuery}
            onChangeText={setSearchQuery}
            mode="outlined"
            style={styles.searchInput}
            left={<TextInput.Icon icon="magnify" />}
            right={searchQuery ? <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} /> : undefined}
          />

          {/* Tag Filters */}
          {allTags.length > 0 && (
            <View style={styles.filterSection}>
              <View style={styles.filterHeader}>
                <Paragraph style={styles.filterTitle}>Filter by tags:</Paragraph>
                {selectedTags.length > 0 && (
                  <Button mode="text" onPress={clearFilters} compact>
                    Clear filters
                  </Button>
                )}
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.tagsScrollView}
                contentContainerStyle={styles.tagsContainer}
              >
                {allTags.map((tag) => (
                  <Chip
                    key={tag}
                    mode={selectedTags.includes(tag) ? 'flat' : 'outlined'}
                    selected={selectedTags.includes(tag)}
                    onPress={() => toggleTag(tag)}
                    style={styles.tagChip}
                  >
                    {tag}
                  </Chip>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Results Info */}
          {(searchQuery || selectedTags.length > 0) && (
            <Paragraph style={styles.resultsInfo}>
              {filteredBooks.length} of {books.length} books
            </Paragraph>
          )}

          {/* Book List */}
          <FlatList
            data={filteredBooks}
            renderItem={renderBookCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.noResultsContainer}>
                <Paragraph style={styles.noResultsText}>No books match your search criteria</Paragraph>
                <Button mode="text" onPress={clearFilters} style={styles.clearFiltersButton}>
                  Clear filters
                </Button>
              </View>
            }
          />
        </View>
      )}
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
  headerActions: {
    flexDirection: 'row',
  },
  headerPlaceholder: {
    width: 96,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
  },
  emptyActions: {
    width: '100%',
  },
  emptyButton: {
    marginBottom: 12,
  },
  listContainer: {
    padding: 16,
  },
  bookCard: {
    marginBottom: 16,
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
  cardContent: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'flex-start',
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
  bookInfo: {
    flex: 1,
    paddingTop: 4,
  },
  bookTitle: {
    fontSize: 20,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 6,
    lineHeight: 26,
  },
  bookAuthor: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    marginBottom: 8,
  },
  bookDescription: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    lineHeight: 24,
    marginBottom: 6,
  },
  bookGenre: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    color: BookColors.accent,
    fontStyle: 'italic',
  },
  contentContainer: {
    flex: 1,
  },
  searchInput: {
    margin: 16,
  },
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  tagsScrollView: {
    maxHeight: 50,
  },
  tagsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 0,
  },
  tagChip: {
    marginRight: 8,
    marginBottom: 0,
  },
  resultsInfo: {
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 12,
    color: '#666',
  },
  noResultsContainer: {
    padding: 32,
    alignItems: 'center',
  },
  noResultsText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
  },
  clearFiltersButton: {
    marginTop: 8,
  },
});