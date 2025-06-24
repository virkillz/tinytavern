import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Paragraph,
  IconButton,
  Title,
  ActivityIndicator,
} from 'react-native-paper';
import { OpenRouterService } from '../services/openrouter';
import { StorageService } from '../utils/storage';
import { Message, AppSettings } from '../types';

interface Props {
  navigation: any;
}

export const ChatScreen: React.FC<Props> = ({ navigation }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadSettings();
    loadMessages();
  }, []);

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
      const chatMessages = newMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await service.sendMessage(settings.selectedModel, chatMessages);
      
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

  const renderMessage = ({ item }: { item: Message }) => (
    <Card style={[
      styles.messageCard,
      item.role === 'user' ? styles.userMessage : styles.assistantMessage
    ]}>
      <Card.Content>
        <Paragraph style={[
          styles.messageText,
          item.role === 'user' ? styles.userMessageText : styles.assistantMessageText
        ]}>
          {item.content}
        </Paragraph>
      </Card.Content>
    </Card>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Chat</Title>
        <View style={styles.headerButtons}>
          <IconButton
            icon="cog"
            size={24}
            onPress={() => navigation.navigate('Settings')}
          />
          <IconButton
            icon="delete"
            size={24}
            onPress={clearChat}
          />
        </View>
      </View>

      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Paragraph style={styles.emptyText}>
            Start a conversation by typing a message below.
          </Paragraph>
          {settings && (
            <Paragraph style={styles.modelInfo}>
              Using: {settings.selectedModel}
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
          <Paragraph style={styles.loadingText}>Thinking...</Paragraph>
        </View>
      )}
    </KeyboardAvoidingView>
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
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 8,
  },
  modelInfo: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageCard: {
    marginBottom: 8,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2196f3',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
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