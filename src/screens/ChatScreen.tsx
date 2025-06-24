import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
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
import { StorageService } from '../utils/storage';
import { CharacterStorageService } from '../services/characterStorage';
import { CharacterCardService } from '../services/characterCard';
import { Message, AppSettings, StoredCharacter } from '../types';

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
    loadMessages();
    loadUserProfile();
  }, []);

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
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const savedMessages = await StorageService.getMessages();
      setMessages(savedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const saveMessages = async (newMessages: Message[]) => {
    try {
      await StorageService.saveMessages(newMessages);
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
      const service = new OpenRouterService(settings.apiKey);
      
      // Prepare messages for API
      let apiMessages: Array<{role: string, content: string}>;
      
      if (selectedCharacter) {
        // Use character-based system prompt
        const characterSystemMessages = CharacterCardService.generateSystemPrompt(selectedCharacter, 'User');
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
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.choices[0].message.content,
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
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setMessages([]);
            await StorageService.clearMessages();
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
            <Avatar.Image size={32} source={{ uri: avatarSource }} />
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
          {selectedCharacter && selectedCharacter.avatar ? (
            <Avatar.Image
              size={40}
              source={{ uri: selectedCharacter.avatar }}
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
          <Title style={styles.headerTitle}>
            {selectedCharacter ? selectedCharacter.name : 'Chat'}
          </Title>
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
                navigation.navigate('Settings');
              }}
              title="Settings"
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
                  source={{ uri: selectedCharacter.avatar }}
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
        <Button
          mode="contained"
          onPress={sendMessage}
          disabled={!inputText.trim() || loading || !settings}
          style={styles.sendButton}
          loading={loading}
        >
          Send
        </Button>
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
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerLeft: {
    width: 60,
    alignItems: 'flex-start',
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
    // No additional styles needed
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    borderRadius: 2,
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