import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
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
import { StorageService } from '../utils/storage';
import { CharacterStorageService } from '../services/characterStorage';
import { CharacterCardService } from '../services/characterCard';
import { Message, AppSettings, StoredCharacter } from '../types';
import { BookColors, BookTypography } from '../styles/theme';
import { replaceCharacterVariables } from '../utils/variableReplacement';

interface Props {
  navigation: any;
}

export const ChatScreen: React.FC<Props> = ({ navigation }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<StoredCharacter | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string; avatar?: string } | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadSettings();
    loadUserProfile();
  }, []);

  // Load messages when selected character changes or user profile loads
  useEffect(() => {
    if (selectedCharacter) {
      loadMessagesWithFirstMessage(selectedCharacter.id);
    } else {
      setMessages([]);
    }
  }, [selectedCharacter, userProfile]);

  const loadMessagesWithFirstMessage = async (characterId: string) => {
    try {
      const savedMessages = await StorageService.getMessages(characterId);
      
      // If no saved messages and we have a character with first_mes, add it
      if (savedMessages.length === 0 && selectedCharacter?.card.data.first_mes) {
        const userName = userProfile?.name || 'User';
        
        // Use variable replacement utility for characters
        const processedContent = replaceCharacterVariables(
          selectedCharacter.card.data.first_mes,
          selectedCharacter.name,
          userName
        );
        
        const firstMessage: Message = {
          id: 'first_message',
          role: 'assistant',
          content: processedContent,
          timestamp: new Date(),
        };
        
        setMessages([firstMessage]);
        // Save the first message so it persists
        await StorageService.saveMessages([firstMessage], characterId);
      } else {
        setMessages(savedMessages);
      }
    } catch (error) {
      console.error('Error loading messages with first message:', error);
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
      
      // Load selected character if any
      if (savedSettings.selectedCharacter) {
        const character = await CharacterStorageService.getCharacterById(savedSettings.selectedCharacter);
        setSelectedCharacter(character);
      } else {
        // If no character is selected, try to select the first available character (likely the default one)
        const allCharacters = await CharacterStorageService.getAllCharacters();
        if (allCharacters.length > 0) {
          setSelectedCharacter(allCharacters[0]);
          // Update settings to remember this selection
          await StorageService.saveSettings({
            ...savedSettings,
            selectedCharacter: allCharacters[0].id,
          });
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadMessages = async (characterId?: string) => {
    try {
      const savedMessages = await StorageService.getMessages(characterId);
      setMessages(savedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const saveMessages = async (newMessages: Message[]) => {
    try {
      await StorageService.saveMessages(newMessages, selectedCharacter?.id);
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !settings) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    try {
      let responseContent: string = '';

      if (settings.provider === 'openrouter') {
        if (!settings.providerSettings?.openrouter?.apiKey) {
          throw new Error('OpenRouter API key not configured');
        }

        const service = new OpenRouterService(settings.providerSettings.openrouter.apiKey);
        
        // Prepare messages for OpenRouter API
        let apiMessages: Array<{role: string, content: string}>;
        
        if (selectedCharacter) {
          // Use character-based system prompt
          const userName = userProfile?.name || 'User';
          const characterSystemMessages = CharacterCardService.generateSystemPrompt(selectedCharacter, userName);
          const userMessages = newMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
          }));
          
          // Combine character system messages with user messages
          apiMessages = [...characterSystemMessages, ...userMessages];
        } else {
          // Use regular system prompt
          const chatMessages = newMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
          }));
          apiMessages = chatMessages;
        }

        const response = await service.sendMessage(
          settings.selectedModel, 
          apiMessages, 
          selectedCharacter ? undefined : settings.systemPrompt
        );
        
        if (response.choices && response.choices.length > 0) {
          responseContent = response.choices[0].message.content;
        } else {
          throw new Error('No response from OpenRouter');
        }

      } else if (settings.provider === 'ollama') {
        if (!settings.providerSettings?.ollama?.host) {
          throw new Error('Ollama host not configured');
        }

        const service = new OllamaService(
          settings.providerSettings.ollama.host, 
          settings.providerSettings.ollama.port
        );

        // Prepare system prompt for Ollama
        let systemPrompt = settings.systemPrompt;
        if (selectedCharacter) {
          // Generate character-based system prompt
          const userName = userProfile?.name || 'User';
          const characterPrompts = CharacterCardService.generateSystemPrompt(selectedCharacter, userName);
          systemPrompt = characterPrompts.map(p => p.content).join('\n');
        }

        responseContent = await service.sendMessage(
          newMessages,
          settings.selectedModel,
          systemPrompt
        );

      } else {
        throw new Error(`Unsupported provider: ${settings.provider}`);
      }

      if (responseContent) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
        };

        const finalMessages = [...newMessages, assistantMessage];
        setMessages(finalMessages);
        await saveMessages(finalMessages);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to send message: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    const characterName = selectedCharacter?.name || 'current character';
    Alert.alert(
      'Clear Chat',
      `Are you sure you want to clear all messages with ${characterName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setMessages([]);
            await StorageService.clearMessages(selectedCharacter?.id);
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const displayName = isUser ? (userProfile?.name || 'You') : (selectedCharacter?.name || 'Assistant');
    const avatarSource = isUser ? userProfile?.avatar : selectedCharacter?.avatar;

    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.assistantMessageContainer
      ]}>
        <View style={styles.messageHeader}>
          {avatarSource ? (
            <Avatar.Image 
              size={32} 
              source={avatarSource === 'default_asset' 
                ? require('../../assets/default.png') 
                : { uri: avatarSource }} 
            />
          ) : (
            <Avatar.Text size={32} label={displayName.charAt(0)} />
          )}
          <Paragraph style={styles.messageName}>{displayName}</Paragraph>
        </View>
        <Card style={[
          styles.messageCard,
          isUser ? styles.userMessage : styles.assistantMessage
        ]}>
          <Card.Content>
            <Paragraph style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.assistantMessageText
            ]}>
              {item.content}
            </Paragraph>
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
            onPress={() => navigation.navigate('Characters')}
            style={styles.chevronButton}
          />
          {selectedCharacter && selectedCharacter.avatar ? (
            <Avatar.Image
              size={40}
              source={selectedCharacter.avatar === 'default_asset' 
                ? require('../../assets/default.png') 
                : { uri: selectedCharacter.avatar }}
              style={styles.headerAvatar}
            />
          ) : (
            <Avatar.Text
              size={40}
              label={selectedCharacter ? selectedCharacter.name.charAt(0) : 'C'}
              style={styles.headerAvatar}
            />
          )}
        </View>
        
        <View style={styles.headerCenter}>
          <TouchableOpacity 
            onPress={() => selectedCharacter && navigation.navigate('CharacterDetail', { characterId: selectedCharacter.id })}
            disabled={!selectedCharacter}
          >
            <Title style={styles.headerTitle}>
              {selectedCharacter ? selectedCharacter.name : 'Chat'}
            </Title>
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerRight}>
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
                navigation.navigate('Characters');
              }}
              title="Manage Characters"
              leadingIcon="account-group"
            />
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Books');
              }}
              title="Interactive Books"
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
                clearChat();
              }}
              title="Clear Chat"
              leadingIcon="delete"
            />
          </Menu>
        </View>
      </View>

      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          {selectedCharacter ? (
            <>
              {selectedCharacter.avatar ? (
                <Avatar.Image
                  size={120}
                  source={selectedCharacter.avatar === 'default_asset' 
                    ? require('../../assets/default.png') 
                    : { uri: selectedCharacter.avatar }}
                  style={styles.largeAvatar}
                />
              ) : (
                <Avatar.Text
                  size={120}
                  label={selectedCharacter.name.charAt(0)}
                  style={styles.largeAvatar}
                />
              )}
              
              <Title style={styles.characterTitle}>
                {selectedCharacter.name}
              </Title>
              
              <Paragraph style={styles.characterSubtitle}>
                AI Character
              </Paragraph>
              
              <Paragraph style={styles.greetingText}>
                Say Hello to {selectedCharacter.name}
              </Paragraph>
            </>
          ) : (
            <>
              <Title style={styles.noCharacterTitle}>
                No Character Selected
              </Title>
              <Paragraph style={styles.noCharacterText}>
                Select a character from the menu to start chatting
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
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          label="Type a message..."
          value={inputText}
          onChangeText={setInputText}
          mode="outlined"
          style={styles.textInput}
          multiline
          onSubmitEditing={sendMessage}
          disabled={loading}
        />
        <IconButton
          icon={loading ? "loading" : "send"}
          mode="contained"
          onPress={sendMessage}
          disabled={!inputText.trim() || loading || !settings}
          style={styles.sendButton}
          iconColor="#fff"
          containerColor="#2196f3"
        />
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" />
          <Paragraph style={styles.loadingText}>
            {selectedCharacter?.name || 'Assistant'} is writing...
          </Paragraph>
        </View>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BookColors.background,
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
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: BookColors.primaryLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
  },
  chevronButton: {
    marginRight: 0,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 60,
    alignItems: 'flex-end',
  },
  headerAvatar: {
    marginLeft: 8,
    // No additional styles needed
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: BookTypography.serif,
    color: BookColors.onSurface,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  largeAvatar: {
    marginBottom: 24,
  },
  characterTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#000',
  },
  characterSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
  },
  greetingText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
    marginBottom: 24,
  },
  noCharacterTitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  noCharacterText: {
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
  messageContainer: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  assistantMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageName: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  messageCard: {
    marginLeft: 40,
  },
  userMessage: {
    backgroundColor: '#2196f3',
  },
  assistantMessage: {
    backgroundColor: '#fff',
  },
  messageText: {
    fontSize: 16,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#000',
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
  sendButton: {
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
});