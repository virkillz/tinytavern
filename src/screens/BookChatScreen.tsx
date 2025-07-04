import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TextInput,
  Button,
  Card,
  Paragraph,
  IconButton,
  Title,
  ActivityIndicator,
  Menu,
  Avatar,
} from 'react-native-paper';
import { OpenRouterService } from '../services/openrouter';
import { OllamaService } from '../services/ollama';
import { OpenAIService } from '../services/openai';
import { StorageService } from '../utils/storage';
import { BookStorageService } from '../services/bookStorage';
import { Message, AppSettings, StoredBook } from '../types';
import { BookColors, BookTypography } from '../styles/theme';
import { replaceBookVariables } from '../utils/variableReplacement';
import { IllustrationGenerationModal } from '../components/IllustrationGenerationModal';
import { ImageStorageService } from '../services/imageStorage';
import ImageGenerationService from '../services/imageGeneration';

interface Props {
  navigation: any;
}

export const BookChatScreen: React.FC<Props> = ({ navigation }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [selectedBook, setSelectedBook] = useState<StoredBook | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string; avatar?: string } | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [messageMenuVisible, setMessageMenuVisible] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [illustrationModalVisible, setIllustrationModalVisible] = useState(false);
  const [currentMessageForIllustration, setCurrentMessageForIllustration] = useState<string | null>(null);
  const [illustrationMenuVisible, setIllustrationMenuVisible] = useState<string | null>(null);
  const [regenerateModalVisible, setRegenerateModalVisible] = useState(false);
  const [regenerateImageUri, setRegenerateImageUri] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadSettings();
    loadUserProfile();
  }, []);

  // Load messages when selected book changes or user profile loads
  useEffect(() => {
    if (selectedBook) {
      loadMessagesWithFirstPage(selectedBook.id);
    } else {
      setMessages([]);
    }
  }, [selectedBook, userProfile]);

  const loadMessagesWithFirstPage = async (bookId: string) => {
    try {
      const savedMessages = await StorageService.getMessages(bookId);
      
      // If no saved messages and we have a book with first_page, add it
      if (savedMessages.length === 0 && selectedBook?.card.data.first_page) {
        const userName = userProfile?.name || 'Reader';
        const firstPageMessage: Message = {
          id: 'first_page',
          role: 'assistant',
          content: selectedBook.card.data.first_page,
          timestamp: new Date(),
        };
        
        setMessages([firstPageMessage]);
        setCurrentPage(1);
        // Save the first page so it persists
        await StorageService.saveMessages([firstPageMessage], bookId);
      } else {
        setMessages(savedMessages);
        setCurrentPage(savedMessages.length > 0 ? Math.ceil(savedMessages.length / 2) : 1);
      }
    } catch (error) {
      console.error('Error loading messages with first page:', error);
      setMessages([]);
    }
  };

  const loadUserProfile = async () => {
    try {
      const profile = await StorageService.getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await StorageService.getSettings();
      if (!savedSettings) {
        Alert.alert(
          'Settings Required',
          'Please configure your API key and model first.',
          [{ text: 'OK', onPress: () => navigation.navigate('Settings') }]
        );
        return;
      }
      setSettings(savedSettings);
      
      // Load selected book if any
      if (savedSettings.selectedBook) {
        const book = await BookStorageService.getBookById(savedSettings.selectedBook);
        setSelectedBook(book);
      } else {
        // If no book is selected, try to select the first available book
        const allBooks = await BookStorageService.getAllBooks();
        if (allBooks.length > 0) {
          setSelectedBook(allBooks[0]);
          // Update settings to remember this selection
          await StorageService.saveSettings({
            ...savedSettings,
            selectedBook: allBooks[0].id,
          });
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveMessages = async (newMessages: Message[]) => {
    try {
      await StorageService.saveMessages(newMessages, selectedBook?.id);
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  };

  const continueStory = async () => {
    if (!inputText.trim() || !settings) return;

    const userChoice: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...messages, userChoice];
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    try {
      let responseContent: string = '';

      // Create book-specific system prompt with variable replacement
      const userName = userProfile?.name || 'Reader';
      const bookSystemPrompt = selectedBook ? 
        replaceBookVariables(
          `You are an interactive storyteller for the book "{{book}}" by {{author}}. 
          
          Setting: ${selectedBook.card.data.scenario}
          
          Description: ${selectedBook.card.data.description}
          
          Continue the story based on {{user}}'s choice. Write the next part of the story in an engaging, narrative style. 
          Keep responses to 2-3 paragraphs maximum. End with a situation that allows {{user}} to make the next choice.
          The main character of this story is ${selectedBook.title}.
          
          {{user}}'s choice: "${inputText.trim()}"`,
          selectedBook.title,
          userName,
          selectedBook.card.data.author
        )
        : 'You are an interactive storyteller. Continue the story based on the reader\'s input.';

      if (settings.provider === 'openrouter') {
        if (!settings.providerSettings?.openrouter?.apiKey) {
          throw new Error('OpenRouter API key not configured');
        }

        const service = new OpenRouterService(settings.providerSettings.openrouter.apiKey);
        
        // Prepare messages for OpenRouter API - strip image markdown
        const apiMessages = [
          { role: 'system', content: bookSystemPrompt },
          ...newMessages.map(msg => ({
            role: msg.role,
            content: stripImageMarkdown(msg.content),
          }))
        ];

        const response = await service.sendMessage(
          settings.selectedModel, 
          apiMessages
        );
        
        if (response.choices && response.choices.length > 0) {
          responseContent = response.choices[0].message.content;
        } else {
          throw new Error('No response from OpenRouter');
        }

      } else if (settings.provider === 'openai') {
        if (!settings.providerSettings?.openai?.apiKey) {
          throw new Error('OpenAI API key not configured');
        }

        const service = new OpenAIService(settings.providerSettings.openai.apiKey);
        
        // Prepare messages for OpenAI API - strip image markdown (same format as OpenRouter)
        const apiMessages = [
          { role: 'system', content: bookSystemPrompt },
          ...newMessages.map(msg => ({
            role: msg.role,
            content: stripImageMarkdown(msg.content),
          }))
        ];

        const response = await service.sendMessage(
          settings.selectedModel, 
          apiMessages
        );
        
        if (response.choices && response.choices.length > 0) {
          responseContent = response.choices[0].message.content;
        } else {
          throw new Error('No response from OpenAI');
        }

      } else if (settings.provider === 'ollama') {
        if (!settings.providerSettings?.ollama?.host) {
          throw new Error('Ollama host not configured');
        }

        const service = new OllamaService(
          settings.providerSettings.ollama.host, 
          settings.providerSettings.ollama.port
        );

        // Strip image markdown from messages before sending to Ollama
        const cleanMessages = newMessages.map(msg => ({
          ...msg,
          content: stripImageMarkdown(msg.content),
        }));

        responseContent = await service.sendMessage(
          cleanMessages,
          settings.selectedModel,
          bookSystemPrompt
        );

      } else {
        throw new Error(`Unsupported provider: ${settings.provider}`);
      }

      if (responseContent) {
        const storyMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
        };

        const finalMessages = [...newMessages, storyMessage];
        setMessages(finalMessages);
        setCurrentPage(Math.ceil(finalMessages.length / 2));
        await saveMessages(finalMessages);
      }
    } catch (error) {
      console.error('Error continuing story:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to continue story: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const clearStory = async () => {
    const bookTitle = selectedBook?.title || 'current book';
    Alert.alert(
      'Clear Story',
      `Are you sure you want to restart "${bookTitle}"? This will return you to the first page.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          style: 'destructive',
          onPress: async () => {
            setMessages([]);
            setCurrentPage(1);
            await StorageService.clearMessages(selectedBook?.id);
            // Reload first page
            if (selectedBook) {
              loadMessagesWithFirstPage(selectedBook.id);
            }
          },
        },
      ]
    );
  };

  const deleteMessage = async (messageId: string) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedMessages = messages.filter(msg => msg.id !== messageId);
            setMessages(updatedMessages);
            setCurrentPage(Math.ceil(updatedMessages.length / 2) || 1);
            await saveMessages(updatedMessages);
          },
        },
      ]
    );
  };

  const startEditMessage = (messageId: string, content: string) => {
    setEditingMessage({ id: messageId, content });
  };

  const saveEditMessage = async () => {
    if (!editingMessage) return;
    
    const updatedMessages = messages.map(msg => 
      msg.id === editingMessage.id 
        ? { ...msg, content: editingMessage.content.trim() }
        : msg
    );
    
    setMessages(updatedMessages);
    await saveMessages(updatedMessages);
    setEditingMessage(null);
  };

  const cancelEditMessage = () => {
    setEditingMessage(null);
  };

  const stripImageMarkdown = (content: string): string => {
    // Remove image markdown syntax but keep the content clean
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    return content.replace(imageRegex, '').replace(/\n\n+/g, '\n\n').trim();
  };

  const renderMessageContent = (content: string, isUserChoice: boolean, messageId: string) => {
    // Split content by image markdown pattern
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
      // Add text before the image
      if (match.index > lastIndex) {
        const textContent = content.substring(lastIndex, match.index);
        if (textContent.trim()) {
          parts.push({
            type: 'text',
            content: textContent,
            key: `text-${lastIndex}`
          });
        }
      }

      // Add the image
      parts.push({
        type: 'image',
        alt: match[1],
        uri: match[2],
        key: `image-${match.index}`,
        messageId: messageId
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after the last image
    if (lastIndex < content.length) {
      const textContent = content.substring(lastIndex);
      if (textContent.trim()) {
        parts.push({
          type: 'text',
          content: textContent,
          key: `text-${lastIndex}`
        });
      }
    }

    // If no images found, just render as text
    if (parts.length === 0) {
      const userName = userProfile?.name || 'Reader';
      const translatedContent = selectedBook ? 
        replaceBookVariables(content, selectedBook.title, userName, selectedBook.card.data.author) : 
        content;
      
      return (
        <Paragraph style={[
          styles.pageText,
          isUserChoice ? styles.choiceText : styles.storyText
        ]}>
          {translatedContent}
        </Paragraph>
      );
    }

    // Render mixed content
    return (
      <View>
        {parts.map((part) => {
          if (part.type === 'text') {
            const userName = userProfile?.name || 'Reader';
            const translatedContent = selectedBook ? 
              replaceBookVariables(part.content, selectedBook.title, userName, selectedBook.card.data.author) : 
              part.content;
            
            return (
              <Paragraph
                key={part.key}
                style={[
                  styles.pageText,
                  isUserChoice ? styles.choiceText : styles.storyText
                ]}
              >
                {translatedContent}
              </Paragraph>
            );
          } else if (part.type === 'image') {
            const menuKey = `${part.messageId}-${part.uri}`;
            return (
              <View key={part.key} style={styles.illustrationContainer}>
                <Image
                  source={{ uri: part.uri }}
                  style={styles.illustrationImage}
                  resizeMode="cover"
                />
                {part.alt && (
                  <Paragraph style={styles.illustrationCaption}>
                    {part.alt}
                  </Paragraph>
                )}
                
                {/* Three-dot menu for illustration */}
                <View style={styles.illustrationMenuContainer}>
                  <Menu
                    visible={illustrationMenuVisible === menuKey}
                    onDismiss={() => setIllustrationMenuVisible(null)}
                    anchor={
                      <IconButton
                        icon="dots-vertical"
                        size={20}
                        iconColor="rgba(255, 255, 255, 0.8)"
                        onPress={() => setIllustrationMenuVisible(menuKey)}
                        style={styles.illustrationMenuButton}
                      />
                    }
                  >
                    <Menu.Item
                      onPress={() => {
                        regenerateIllustration(part.messageId, part.uri);
                      }}
                      title="Regenerate"
                      leadingIcon="refresh"
                    />
                    <Menu.Item
                      onPress={() => {
                        deleteIllustration(part.messageId, part.uri);
                      }}
                      title="Delete"
                      leadingIcon="trash-can"
                    />
                  </Menu>
                </View>
              </View>
            );
          }
          return null;
        })}
      </View>
    );
  };

  const openIllustrationModal = async (messageId: string) => {
    try {
      const isConfigured = await ImageGenerationService.isConfigured();
      
      if (!isConfigured) {
        Alert.alert(
          'Image Generator Not Configured',
          'To use AI illustration generation, please configure your image generator service in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Configure', onPress: () => navigation.navigate('Settings') }
          ]
        );
        return;
      }
      
      setCurrentMessageForIllustration(messageId);
      setIllustrationModalVisible(true);
    } catch (error) {
      console.error('Error checking image generator configuration:', error);
      Alert.alert(
        'Configuration Error',
        'Unable to check image generator configuration. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const closeIllustrationModal = () => {
    setIllustrationModalVisible(false);
    setCurrentMessageForIllustration(null);
  };

  const handleIllustrationGenerated = async (base64Image: string) => {
    if (!currentMessageForIllustration) return;

    try {
      // Save the illustration to local storage
      const savedImage = await ImageStorageService.saveImage(
        base64Image,
        'Story illustration',
        'horizontal'
      );

      // Find the message and append the image markdown
      const updatedMessages = messages.map(msg => {
        if (msg.id === currentMessageForIllustration) {
          const imageMarkdown = `\n\n![Story Illustration](${savedImage.uri})`;
          return {
            ...msg,
            content: msg.content + imageMarkdown
          };
        }
        return msg;
      });

      setMessages(updatedMessages);
      await saveMessages(updatedMessages);
    } catch (error) {
      console.error('Error adding illustration to message:', error);
      Alert.alert('Error', 'Failed to add illustration to story');
    }
  };

  const deleteIllustration = async (messageId: string, imageUri: string) => {
    Alert.alert(
      'Delete Illustration',
      'Are you sure you want to delete this illustration?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove the image markdown from the message
              const updatedMessages = messages.map(msg => {
                if (msg.id === messageId) {
                  const imageMarkdown = `![Story Illustration](${imageUri})`;
                  const newContent = msg.content.replace(imageMarkdown, '').replace(/\n\n+/g, '\n\n').trim();
                  return {
                    ...msg,
                    content: newContent
                  };
                }
                return msg;
              });

              setMessages(updatedMessages);
              await saveMessages(updatedMessages);
              setIllustrationMenuVisible(null);

              // Delete the image file from storage
              try {
                await ImageStorageService.deleteImageByUri(imageUri);
              } catch (error) {
                console.warn('Failed to delete image file:', error);
              }
            } catch (error) {
              console.error('Error deleting illustration:', error);
              Alert.alert('Error', 'Failed to delete illustration');
            }
          },
        },
      ]
    );
  };

  const regenerateIllustration = (messageId: string, imageUri: string) => {
    setCurrentMessageForIllustration(messageId);
    setRegenerateImageUri(imageUri);
    setRegenerateModalVisible(true);
    setIllustrationMenuVisible(null);
  };

  const handleRegeneratedIllustration = async (base64Image: string) => {
    if (!currentMessageForIllustration || !regenerateImageUri) return;

    try {
      // Save the new illustration to local storage
      const savedImage = await ImageStorageService.saveImage(
        base64Image,
        'Story illustration',
        'horizontal'
      );

      // Replace the old image with the new one in the message
      const updatedMessages = messages.map(msg => {
        if (msg.id === currentMessageForIllustration) {
          const oldImageMarkdown = `![Story Illustration](${regenerateImageUri})`;
          const newImageMarkdown = `![Story Illustration](${savedImage.uri})`;
          const newContent = msg.content.replace(oldImageMarkdown, newImageMarkdown);
          return {
            ...msg,
            content: newContent
          };
        }
        return msg;
      });

      setMessages(updatedMessages);
      await saveMessages(updatedMessages);

      // Delete the old image file
      try {
        await ImageStorageService.deleteImageByUri(regenerateImageUri);
      } catch (error) {
        console.warn('Failed to delete old image file:', error);
      }

      setRegenerateImageUri(null);
    } catch (error) {
      console.error('Error regenerating illustration:', error);
      Alert.alert('Error', 'Failed to regenerate illustration');
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUserChoice = item.role === 'user';
    const pageNumber = Math.ceil((index + 1) / 2);
    const isFirstStoryPage = index === 0 && !isUserChoice;
    const isEditing = editingMessage?.id === item.id;

    return (
      <View style={styles.pageContainer}>
        {/* Book Cover - Only show before first story page */}
        {isFirstStoryPage && selectedBook && (
          <View style={styles.bookCoverContainer}>
            {selectedBook.cover ? (
              <Image
                source={selectedBook.cover === 'default_book_asset' 
                  ? require('../../assets/default.png') 
                  : { uri: selectedBook.cover }}
                style={styles.bookCover}
              />
            ) : (
              <View style={styles.bookCoverPlaceholder}>
                <Avatar.Icon
                  size={80}
                  icon="book"
                  style={styles.bookCoverIcon}
                />
              </View>
            )}
            <Title style={styles.bookCoverTitle}>{selectedBook.title}</Title>
            <Paragraph style={styles.bookCoverAuthor}>by {selectedBook.card.data.author}</Paragraph>
          </View>
        )}

        {/* Page Header */}
        <View style={styles.pageHeader}>
          <Paragraph style={styles.pageNumber}>
            {isUserChoice ? `Your Choice - Page ${pageNumber}` : `Page ${pageNumber}`}
          </Paragraph>
          <Paragraph style={styles.bookTitle}>
            {selectedBook?.title || 'Interactive Story'}
          </Paragraph>
        </View>

        {/* Page Content */}
        <Card style={[
          styles.pageCard,
          isUserChoice ? styles.choiceCard : styles.storyCard
        ]}>
          <Card.Content style={styles.pageContent}>
            {/* Dropdown Menu - Top Right Corner */}
            {!isEditing && (
              <View style={styles.messageMenuContainer}>
                <Menu
                  visible={messageMenuVisible === item.id}
                  onDismiss={() => setMessageMenuVisible(null)}
                  anchor={
                    <IconButton
                      icon="dots-vertical"
                      size={20}
                      iconColor="#999"
                      onPress={() => setMessageMenuVisible(item.id)}
                      style={styles.messageMenuButton}
                    />
                  }
                >
                  <Menu.Item
                    onPress={() => {
                      setMessageMenuVisible(null);
                      startEditMessage(item.id, item.content);
                    }}
                    title="Edit"
                    leadingIcon="pencil"
                  />
                  <Menu.Item
                    onPress={() => {
                      setMessageMenuVisible(null);
                      openIllustrationModal(item.id);
                    }}
                    title="Insert Illustration"
                    leadingIcon="image-plus"
                  />
                  <Menu.Item
                    onPress={() => {
                      setMessageMenuVisible(null);
                      deleteMessage(item.id);
                    }}
                    title="Delete"
                    leadingIcon="trash-can"
                  />
                </Menu>
              </View>
            )}

            {isUserChoice && !isEditing && (
              <View style={styles.choiceHeader}>
                <Avatar.Text 
                  size={24} 
                  label="You" 
                  style={styles.choiceAvatar}
                />
                <Paragraph style={styles.choiceLabel}>Your Choice:</Paragraph>
              </View>
            )}

            {isEditing ? (
              <View style={styles.editContainer}>
                <TextInput
                  value={editingMessage.content}
                  onChangeText={(text) => setEditingMessage({ ...editingMessage, content: text })}
                  multiline
                  mode="outlined"
                  style={styles.editInput}
                  autoFocus
                />
                <View style={styles.editActions}>
                  <IconButton
                    icon="close"
                    mode="outlined"
                    onPress={cancelEditMessage}
                    style={styles.editActionButton}
                  />
                  <IconButton
                    icon="check"
                    mode="contained"
                    onPress={saveEditMessage}
                    disabled={!editingMessage.content.trim()}
                    style={styles.editActionButton}
                  />
                </View>
              </View>
            ) : (
              <View>
                {renderMessageContent(item.content, isUserChoice, item.id)}
              </View>
            )}
          </Card.Content>
        </Card>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <IconButton
              icon="chevron-left"
              size={24}
              onPress={() => navigation.navigate('Books')}
              style={styles.chevronButton}
            />
            <TouchableOpacity 
              onPress={() => selectedBook && navigation.navigate('BookDetail', { bookId: selectedBook.id })}
              disabled={!selectedBook}
            >
              <Title style={styles.headerTitle}>
                {selectedBook ? selectedBook.title : 'Interactive Story'}
              </Title>
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerRight}>
            <Paragraph style={styles.pageCounter}>
              Page {currentPage}
            </Paragraph>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon="menu"
                  size={24}
                  onPress={() => setMenuVisible(true)}
                />
              }
            >
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('Home');
                }}
                title="Home"
                leadingIcon="home"
              />
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('Profile');
                }}
                title="Profile"
                leadingIcon="account"
              />
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('Books');
                }}
                title="Manage Books"
                leadingIcon="book-multiple"
              />
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('Settings');
                }}
                title="Providers"
                leadingIcon="cog"
              />
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  clearStory();
                }}
                title="Restart Story"
                leadingIcon="restart"
              />
            </Menu>
          </View>
        </View>

        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            {selectedBook ? (
              <>
                {selectedBook.cover ? (
                  <Avatar.Image
                    size={120}
                    source={selectedBook.cover === 'default_book_asset' 
                      ? require('../../assets/default.png') 
                      : { uri: selectedBook.cover }}
                    style={styles.largeCover}
                  />
                ) : (
                  <Avatar.Icon
                    size={120}
                    icon="book"
                    style={styles.largeCover}
                  />
                )}
                
                <Title style={styles.bookTitleLarge}>
                  {selectedBook.title}
                </Title>
                
                <Paragraph style={styles.bookAuthor}>
                  by {selectedBook.card.data.author}
                </Paragraph>
                
                <Paragraph style={styles.readyText}>
                  Ready to begin your interactive adventure?
                </Paragraph>
              </>
            ) : (
              <>
                <Title style={styles.noBookTitle}>
                  No Book Selected
                </Title>
                <Paragraph style={styles.noBookText}>
                  Select a book from the menu to start reading
                </Paragraph>
              </>
            )}
            
            {settings && (
              <Paragraph style={styles.modelInfo}>
                Model: {settings.selectedModel}
              </Paragraph>
            )}
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={styles.inputContainer}>
          <TextInput
            label="What happens next?"
            value={inputText}
            onChangeText={setInputText}
            mode="outlined"
            style={styles.textInput}
            multiline
            onSubmitEditing={continueStory}
            disabled={loading}
            placeholder="Describe what you want to happen in the story..."
          />
          <IconButton
            icon={loading ? "loading" : "arrow-right"}
            mode="contained"
            onPress={continueStory}
            disabled={!inputText.trim() || loading || !settings}
            style={styles.continueButton}
            iconColor="#fff"
            containerColor="#2196f3"
          />
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" />
            <Paragraph style={styles.loadingText}>
              Writing the next part of your story...
            </Paragraph>
          </View>
        )}

        <IllustrationGenerationModal
          visible={illustrationModalVisible}
          onClose={closeIllustrationModal}
          onImageGenerated={handleIllustrationGenerated}
          messageContent={currentMessageForIllustration ? 
            messages.find(msg => msg.id === currentMessageForIllustration)?.content : undefined}
        />

        {/* Regenerate Illustration Modal */}
        <IllustrationGenerationModal
          visible={regenerateModalVisible}
          onClose={() => {
            setRegenerateModalVisible(false);
            setCurrentMessageForIllustration(null);
            setRegenerateImageUri(null);
          }}
          onImageGenerated={handleRegeneratedIllustration}
          messageContent={currentMessageForIllustration ? 
            messages.find(msg => msg.id === currentMessageForIllustration)?.content : undefined}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BookColors.surface,
  },
  flex: {
    flex: 1,
  },
  header: {
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chevronButton: {
    marginRight: 0,
  },
  headerTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageCounter: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  largeCover: {
    marginBottom: 24,
  },
  bookTitleLarge: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#000',
  },
  bookAuthor: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
  },
  readyText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
    marginBottom: 24,
  },
  noBookTitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  noBookText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  modelInfo: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    position: 'absolute',
    bottom: 100,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  pageContainer: {
    marginBottom: 24,
  },
  pageHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  pageNumber: {
    fontSize: 14,
    color: '#888',
    fontWeight: 'bold',
  },
  bookTitle: {
    fontSize: 12,
    color: '#aaa',
    fontStyle: 'italic',
  },
  pageCard: {
    elevation: 4,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    borderRadius: 12,
    backgroundColor: BookColors.surface,
    borderWidth: 1,
    borderColor: BookColors.primaryLight,
  },
  storyCard: {
    backgroundColor: BookColors.parchment,
    borderLeftWidth: 6,
    borderLeftColor: BookColors.primary,
  },
  choiceCard: {
    backgroundColor: BookColors.surfaceVariant,
    borderLeftWidth: 6,
    borderLeftColor: BookColors.accent,
  },
  pageContent: {
    padding: 20,
  },
  choiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  choiceAvatar: {
    backgroundColor: '#ff9800',
    marginRight: 8,
  },
  choiceLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff9800',
  },
  pageText: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: BookTypography.serif,
  },
  storyText: {
    color: BookColors.onSurface,
  },
  choiceText: {
    color: BookColors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  bookCoverContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
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
  bookCover: {
    width: 200,
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 4,
    shadowColor: BookColors.cardShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: BookColors.primary,
  },
  bookCoverPlaceholder: {
    width: 200,
    height: 300,
    borderRadius: 12,
    backgroundColor: BookColors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: BookColors.cardShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: BookColors.primary,
  },
  bookCoverIcon: {
    backgroundColor: 'transparent',
  },
  bookCoverTitle: {
    fontSize: 24,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  bookCoverAuthor: {
    fontSize: 16,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    marginRight: 8,
    maxHeight: 100,
  },
  continueButton: {
    borderRadius: 24,
    alignSelf: 'flex-end',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#fff',
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
  messageMenuContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  messageMenuButton: {
    margin: 0,
    width: 32,
    height: 32,
  },
  editContainer: {
    width: '100%',
  },
  editInput: {
    marginBottom: 12,
    minHeight: 60,
    backgroundColor: '#fff',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editActionButton: {
    width: 40,
    height: 40,
  },
  illustrationContainer: {
    marginVertical: 16,
    alignItems: 'center',
  },
  illustrationImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    elevation: 3,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  illustrationCaption: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  illustrationMenuContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    elevation: 4,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  illustrationMenuButton: {
    margin: 0,
    width: 32,
    height: 32,
  },
});