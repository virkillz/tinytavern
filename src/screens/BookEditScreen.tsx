import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  IconButton,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { BookStorageService } from '../services/bookStorage';
import ImageGenerationService from '../services/imageGeneration';
import { StoredBook, BookCard } from '../types';

interface Props {
  navigation: any;
  route: {
    params: {
      bookId: string | null;
    };
  };
}

export const BookEditScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookId } = route.params;
  const isEditing = bookId !== null;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [book, setBook] = useState<StoredBook | null>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('');
  const [scenario, setScenario] = useState('');
  const [firstPage, setFirstPage] = useState('');
  const [summary, setSummary] = useState('');
  const [creatorNotes, setCreatorNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);

  useEffect(() => {
    if (isEditing && bookId) {
      loadBook();
    }
  }, [bookId, isEditing]);

  const loadBook = async () => {
    if (!bookId) return;
    
    try {
      setLoading(true);
      const loadedBook = await BookStorageService.getBookById(bookId);
      if (loadedBook) {
        setBook(loadedBook);
        setTitle(loadedBook.card.data.title);
        setDescription(loadedBook.card.data.description);
        setAuthor(loadedBook.card.data.author);
        setGenre(loadedBook.card.data.genre || '');
        setScenario(loadedBook.card.data.scenario);
        setFirstPage(loadedBook.card.data.first_page);
        setSummary(loadedBook.card.data.summary || '');
        setCreatorNotes(loadedBook.card.data.creator_notes || '');
        setTags(loadedBook.card.data.tags || []);
        setCoverUri(loadedBook.cover || null);
      }
    } catch (error) {
      console.error('Error loading book:', error);
      Alert.alert('Error', 'Failed to load book');
    } finally {
      setLoading(false);
    }
  };

  const showImageSourceChoice = () => {
    Alert.alert(
      'Choose Image Source',
      'How would you like to add a cover for this book?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Generate Image',
          onPress: () => generateCover(),
        },
        {
          text: 'Upload from Gallery',
          onPress: () => pickCoverFromGallery(),
        },
      ]
    );
  };

  const pickCoverFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to select a cover image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4], // Book cover aspect ratio
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setCoverUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking cover:', error);
      Alert.alert('Error', 'Failed to pick cover image');
    }
  };

  const generateCover = async () => {
    try {
      // Check if image generation is configured
      const isConfigured = await ImageGenerationService.isConfigured();
      if (!isConfigured) {
        Alert.alert(
          'Image Generator Not Configured',
          'Please configure the image generator in Settings to use this feature.',
          [
            {
              text: 'OK',
            },
            {
              text: 'Go to Settings',
              onPress: () => navigation.navigate('Settings'),
            },
          ]
        );
        return;
      }

      setGeneratingImage(true);

      // Create a prompt based on book details
      let prompt = '';
      if (title.trim()) {
        prompt = `book cover for "${title.trim()}"`;
      }
      if (genre.trim()) {
        prompt += `, ${genre.trim()} genre`;
      }
      if (description.trim()) {
        prompt += `, ${description.trim()}`;
      }

      // Fallback prompt if no details provided yet
      if (!prompt) {
        prompt = 'fantasy book cover, detailed artwork, professional design';
      } else {
        prompt += ', book cover design, detailed artwork';
      }

      const base64Image = await ImageGenerationService.generateImage(prompt, 'vertical');
      
      // Convert base64 to file URI
      const fileName = `generated_book_cover_${Date.now()}.png`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, base64Image, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setCoverUri(fileUri);
      Alert.alert('Success', 'Book cover generated successfully!');
    } catch (error) {
      console.error('Error generating cover:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to generate cover');
    } finally {
      setGeneratingImage(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a book title.');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please enter a book description.');
      return false;
    }
    if (!author.trim()) {
      Alert.alert('Validation Error', 'Please enter the author name.');
      return false;
    }
    if (!scenario.trim()) {
      Alert.alert('Validation Error', 'Please enter the book setting/scenario.');
      return false;
    }
    if (!firstPage.trim()) {
      Alert.alert('Validation Error', 'Please enter the first page content.');
      return false;
    }
    return true;
  };

  const saveBook = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const bookCard: BookCard = {
        spec: 'interactive_book_v1',
        spec_version: '1.0',
        data: {
          title: title.trim(),
          description: description.trim(),
          author: author.trim(),
          genre: genre.trim() || undefined,
          scenario: scenario.trim(),
          first_page: firstPage.trim(),
          summary: summary.trim() || undefined,
          creator_notes: creatorNotes.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
        },
      };

      if (isEditing && bookId) {
        // Update existing book
        let finalCoverUri = book?.cover;
        
        if (coverUri && coverUri !== book?.cover) {
          finalCoverUri = await BookStorageService.saveBookCover(bookId, coverUri);
        }

        await BookStorageService.updateBook(bookId, {
          title: title.trim(),
          card: bookCard,
          cover: finalCoverUri || undefined,
        });

        Alert.alert('Success', 'Book updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Create new book
        let finalCoverUri: string | undefined;
        
        if (coverUri) {
          const tempBookId = Date.now().toString();
          finalCoverUri = await BookStorageService.saveBookCover(tempBookId, coverUri);
        }

        await BookStorageService.createBook({
          title: title.trim(),
          card: bookCard,
          cover: finalCoverUri,
        });

        Alert.alert('Success', 'Book created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error saving book:', error);
      Alert.alert('Error', 'Failed to save book');
    } finally {
      setSaving(false);
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
          <Title style={styles.headerTitle}>
            {isEditing ? 'Edit Book' : 'Create Book'}
          </Title>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Paragraph style={styles.loadingText}>Loading book...</Paragraph>
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
        <Title style={styles.headerTitle}>
          {isEditing ? 'Edit Book' : 'Create Book'}
        </Title>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Book Information</Title>
              
              {/* Cover Image */}
              <View style={styles.coverSection}>
                <Paragraph style={styles.fieldLabel}>Cover Image</Paragraph>
                <TouchableOpacity 
                  onPress={showImageSourceChoice} 
                  style={styles.coverPicker}
                  disabled={generatingImage}
                >
                  {coverUri ? (
                    <Image source={{ uri: coverUri }} style={styles.coverPreview} />
                  ) : (
                    <View style={styles.coverPlaceholder}>
                      {generatingImage ? (
                        <>
                          <ActivityIndicator size="large" color="#666" />
                          <Paragraph style={styles.coverPlaceholderText}>
                            Generating cover...
                          </Paragraph>
                        </>
                      ) : (
                        <>
                          <IconButton icon="book" size={40} />
                          <Paragraph style={styles.coverPlaceholderText}>
                            Tap to select cover
                          </Paragraph>
                        </>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
                {coverUri && !generatingImage && (
                  <TouchableOpacity 
                    onPress={showImageSourceChoice}
                    style={styles.changeCoverButton}
                  >
                    <Paragraph style={styles.changeCoverText}>Change Cover</Paragraph>
                  </TouchableOpacity>
                )}
              </View>

              {/* Basic Info */}
              <TextInput
                label="Book Title *"
                value={title}
                onChangeText={setTitle}
                mode="outlined"
                style={styles.input}
                placeholder="Enter the book title"
                helperText="When importing character cards, this comes from the character 'name'"
              />

              <TextInput
                label="Author *"
                value={author}
                onChangeText={setAuthor}
                mode="outlined"
                style={styles.input}
                placeholder="Enter the author name (maps from character creator)"
                helperText="When importing character cards, this comes from the 'creator' field"
              />

              <TextInput
                label="Genre"
                value={genre}
                onChangeText={setGenre}
                mode="outlined"
                style={styles.input}
                placeholder="e.g., Fantasy, Sci-Fi, Romance, Mystery"
              />

              <TextInput
                label="Description *"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                placeholder="Brief description of the book"
              />

              <TextInput
                label="Summary"
                value={summary}
                onChangeText={setSummary}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                placeholder="Detailed summary or back cover text"
              />
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Story Content</Title>
              
              <TextInput
                label="Setting/Scenario *"
                value={scenario}
                onChangeText={setScenario}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                placeholder="Describe the world, time period, and initial situation. Use {{user}} and {{char}} for personalization."
                helperText="Supports template variables: {{user}}, {{char}}, {{book}}, {{author}}"
              />

              <TextInput
                label="First Page *"
                value={firstPage}
                onChangeText={setFirstPage}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
                placeholder="The opening content that readers will see first. Use {{user}} for reader's name, {{char}} for main character."
                helperText="Supports variables: {{user}} (reader's name), {{char}} (main character), {{book}} (book title), {{author}} (author name)"
              />

              <TextInput
                label="Creator Notes"
                value={creatorNotes}
                onChangeText={setCreatorNotes}
                mode="outlined"
                multiline
                numberOfLines={2}
                style={styles.input}
                placeholder="Notes for other creators or readers (optional)"
              />
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Tags</Title>
              <Paragraph style={styles.fieldDescription}>
                Add tags to help organize and categorize your book
              </Paragraph>
              
              <View style={styles.tagInputContainer}>
                <TextInput
                  label="Add Tag"
                  value={newTag}
                  onChangeText={setNewTag}
                  mode="outlined"
                  style={styles.tagInput}
                  onSubmitEditing={addTag}
                  placeholder="Enter a tag"
                />
                <Button
                  mode="outlined"
                  onPress={addTag}
                  disabled={!newTag.trim()}
                  style={styles.addTagButton}
                >
                  Add
                </Button>
              </View>

              {tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {tags.map((tag, index) => (
                    <Chip
                      key={index}
                      onClose={() => removeTag(tag)}
                      style={styles.tag}
                    >
                      {tag}
                    </Chip>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>

          <View style={styles.actionButtons}>
            <Button
              mode="contained"
              onPress={saveBook}
              loading={saving}
              disabled={saving}
              style={styles.saveButton}
            >
              {isEditing ? 'Update Book' : 'Create Book'}
            </Button>
            
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              disabled={saving}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  flex: {
    flex: 1,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
    color: '#333',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  fieldDescription: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  input: {
    marginBottom: 16,
  },
  coverSection: {
    marginBottom: 16,
  },
  coverPicker: {
    alignItems: 'center',
  },
  coverPreview: {
    width: 120,
    height: 160,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  coverPlaceholder: {
    width: 120,
    height: 160,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholderText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  changeCoverButton: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    alignSelf: 'center',
  },
  changeCoverText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  tagInput: {
    flex: 1,
    marginRight: 8,
  },
  addTagButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    marginBottom: 8,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 32,
  },
  saveButton: {
    paddingVertical: 8,
  },
  cancelButton: {
    paddingVertical: 8,
  },
});