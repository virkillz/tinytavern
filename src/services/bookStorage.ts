import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { StoredBook, BookCard, CharacterCard } from '../types';

const BOOKS_KEY = 'stored_books';
const BOOK_IMAGES_DIR = `${FileSystem.documentDirectory}book_images/`;

export class BookStorageService {
  
  // Initialize storage directory
  static async initializeStorage(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(BOOK_IMAGES_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(BOOK_IMAGES_DIR, { intermediates: true });
      }
    } catch (error) {
      console.error('Error initializing book storage:', error);
    }
  }

  // Get all stored books
  static async getAllBooks(): Promise<StoredBook[]> {
    try {
      const booksJson = await AsyncStorage.getItem(BOOKS_KEY);
      if (!booksJson) return [];
      
      const books = JSON.parse(booksJson);
      return books.map((book: any) => ({
        ...book,
        createdAt: new Date(book.createdAt),
        updatedAt: new Date(book.updatedAt)
      }));
    } catch (error) {
      console.error('Error getting books:', error);
      return [];
    }
  }

  // Get book by ID
  static async getBookById(id: string): Promise<StoredBook | null> {
    try {
      const books = await this.getAllBooks();
      return books.find(book => book.id === id) || null;
    } catch (error) {
      console.error('Error getting book by ID:', error);
      return null;
    }
  }

  // Save books to storage
  static async saveBooks(books: StoredBook[]): Promise<void> {
    try {
      await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(books));
    } catch (error) {
      console.error('Error saving books:', error);
      throw error;
    }
  }

  // Create new book
  static async createBook(bookData: {
    title: string;
    card: BookCard;
    cover?: string;
  }): Promise<StoredBook> {
    try {
      const books = await this.getAllBooks();
      const newBook: StoredBook = {
        id: Date.now().toString(),
        title: bookData.title,
        card: bookData.card,
        cover: bookData.cover,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      books.push(newBook);
      await this.saveBooks(books);
      return newBook;
    } catch (error) {
      console.error('Error creating book:', error);
      throw error;
    }
  }

  // Update existing book
  static async updateBook(bookId: string, updates: {
    title?: string;
    card?: BookCard;
    cover?: string;
  }): Promise<StoredBook> {
    try {
      const books = await this.getAllBooks();
      const bookIndex = books.findIndex(book => book.id === bookId);
      
      if (bookIndex === -1) {
        throw new Error('Book not found');
      }

      books[bookIndex] = {
        ...books[bookIndex],
        ...updates,
        updatedAt: new Date(),
      };

      await this.saveBooks(books);
      return books[bookIndex];
    } catch (error) {
      console.error('Error updating book:', error);
      throw error;
    }
  }

  // Delete book
  static async deleteBook(bookId: string): Promise<void> {
    try {
      const books = await this.getAllBooks();
      const filteredBooks = books.filter(book => book.id !== bookId);
      
      // Delete cover image if it exists
      const book = books.find(b => b.id === bookId);
      if (book?.cover && book.cover.startsWith('file://')) {
        try {
          await FileSystem.deleteAsync(book.cover, { idempotent: true });
        } catch (error) {
          console.warn('Error deleting book cover:', error);
        }
      }

      await this.saveBooks(filteredBooks);
    } catch (error) {
      console.error('Error deleting book:', error);
      throw error;
    }
  }

  // Save book cover image
  static async saveBookCover(bookId: string, imageUri: string): Promise<string> {
    try {
      await this.initializeStorage();
      const fileName = `book_${bookId}_cover.jpg`;
      const destinationUri = `${BOOK_IMAGES_DIR}${fileName}`;
      
      await FileSystem.copyAsync({
        from: imageUri,
        to: destinationUri,
      });

      return destinationUri;
    } catch (error) {
      console.error('Error saving book cover:', error);
      throw error;
    }
  }

  // Convert Character Card to Book Card
  static convertCharacterCardToBookCard(characterCard: CharacterCard): BookCard {
    const characterData = characterCard.data;
    
    const bookCard: BookCard = {
      spec: 'interactive_book_v1',
      spec_version: '1.0',
      data: {
        title: characterData.name || 'Untitled Story',
        description: characterData.description || 'An interactive story',
        author: characterData.creator || 'Unknown Author',
        scenario: characterData.scenario || 'A mysterious adventure begins...',
        first_page: characterData.first_mes || 'Welcome to this interactive story. What would you like to happen first?',
        tags: characterData.tags || undefined,
        creator_notes: characterData.creator_notes || undefined,
        // Optional fields
        genre: undefined, // Will be set manually if needed
        summary: characterData.description, // Use description as summary
      },
    };

    return bookCard;
  }

  // Import book from character PNG
  static async importBookFromCharacterPNG(imageUri: string, characterCard: CharacterCard): Promise<StoredBook> {
    try {
      await this.initializeStorage();
      
      // Convert character card to book card
      const bookCard = this.convertCharacterCardToBookCard(characterCard);
      
      const bookId = Date.now().toString();
      const coverUri = await this.saveBookCover(bookId, imageUri);
      
      const newBook: StoredBook = {
        id: bookId,
        title: bookCard.data.title,
        card: bookCard,
        cover: coverUri,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const books = await this.getAllBooks();
      books.push(newBook);
      await this.saveBooks(books);
      
      return newBook;
    } catch (error) {
      console.error('Error importing book from character PNG:', error);
      throw error;
    }
  }

  // Import book from PNG (generic - supports both book and character cards)
  static async importBookFromPNG(imageUri: string, cardData: BookCard | CharacterCard): Promise<StoredBook> {
    try {
      await this.initializeStorage();
      
      let bookCard: BookCard;
      
      // Check if it's a character card and convert it
      if ('spec' in cardData && (cardData.spec === 'chara_card_v2' || cardData.spec === 'chara_card_v3')) {
        bookCard = this.convertCharacterCardToBookCard(cardData as CharacterCard);
      } else {
        bookCard = cardData as BookCard;
      }
      
      const bookId = Date.now().toString();
      const coverUri = await this.saveBookCover(bookId, imageUri);
      
      const newBook: StoredBook = {
        id: bookId,
        title: bookCard.data.title,
        card: bookCard,
        cover: coverUri,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const books = await this.getAllBooks();
      books.push(newBook);
      await this.saveBooks(books);
      
      return newBook;
    } catch (error) {
      console.error('Error importing book from PNG:', error);
      throw error;
    }
  }

  // Initialize default book (optional)
  static async initializeDefaultBook(): Promise<void> {
    try {
      const books = await this.getAllBooks();
      if (books.length === 0) {
        const defaultBookCard: BookCard = {
          spec: 'interactive_book_v1',
          spec_version: '1.0',
          data: {
            title: 'Welcome to Interactive Stories',
            description: 'A sample interactive book to get you started with TinyTavern\'s storytelling features. You can import any character card PNG and convert it to an interactive book!',
            author: 'TinyTavern Team',
            genre: 'Tutorial',
            scenario: 'You are about to embark on an interactive storytelling adventure where your choices shape the narrative. Character cards can be imported and automatically converted to interactive books.',
            first_page: 'Welcome to the world of interactive storytelling! This book was created using the same format as character cards. Import any character PNG to create your own interactive adventure. What would you like to happen next?',
            tags: ['tutorial', 'welcome', 'interactive', 'character-conversion'],
            summary: 'An introductory book demonstrating how character cards can be converted to interactive stories.',
            creator_notes: 'This example shows how character card data (name→title, creator→author, first_mes→first_page) maps to book format.',
          },
        };

        await this.createBook({
          title: defaultBookCard.data.title,
          card: defaultBookCard,
          cover: 'default_book_asset',
        });
      }
    } catch (error) {
      console.error('Error initializing default book:', error);
    }
  }
}