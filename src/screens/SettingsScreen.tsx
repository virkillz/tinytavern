import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import { OpenRouterService } from '../services/openrouter';
import { StorageService } from '../utils/storage';
import { OpenRouterModel } from '../types';

interface Props {
  navigation: any;
}

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant.');
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await StorageService.getSettings();
      if (settings) {
        setApiKey(settings.apiKey);
        setSelectedModel(settings.selectedModel);
        setSystemPrompt(settings.systemPrompt || 'You are a helpful AI assistant.');
        if (settings.apiKey) {
          await fetchModels(settings.apiKey);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const fetchModels = async (key: string) => {
    if (!key.trim()) return;
    
    setLoading(true);
    try {
      const service = new OpenRouterService(key);
      const fetchedModels = await service.getModels();
      setModels(fetchedModels);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch models. Please check your API key.');
      console.error('Error fetching models:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter your API key first.');
      return;
    }

    setTestingConnection(true);
    try {
      await fetchModels(apiKey);
      Alert.alert('Success', 'Connection successful! Models loaded.');
    } catch (error) {
      Alert.alert('Error', 'Connection failed. Please check your API key.');
    } finally {
      setTestingConnection(false);
    }
  };

  const saveSettings = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter your API key.');
      return;
    }

    if (!selectedModel && models.length > 0) {
      Alert.alert('Error', 'Please select a model.');
      return;
    }

    try {
      await StorageService.saveSettings({
        apiKey: apiKey.trim(),
        selectedModel: selectedModel || (models.length > 0 ? models[0].id : ''),
        systemPrompt: systemPrompt.trim() || 'You are a helpful AI assistant.',
      });
      Alert.alert('Success', 'Settings saved successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Chat') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings.');
      console.error('Error saving settings:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.navigate('Chat')}
        />
        <Title style={styles.headerTitle}>Settings</Title>
        <View style={styles.headerPlaceholder} />
      </View>
      
      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.card}>
            <Card.Content>
              <Title>OpenRouter Settings</Title>
              <Paragraph style={styles.description}>
                Configure your API key, model, and system prompt.
              </Paragraph>

            <TextInput
              label="API Key"
              value={apiKey}
              onChangeText={setApiKey}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              placeholder="sk-or-..."
            />

            <TextInput
              label="System Prompt"
              value={systemPrompt}
              onChangeText={setSystemPrompt}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              placeholder="You are a helpful AI assistant..."
            />

            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={testConnection}
                loading={testingConnection}
                disabled={!apiKey.trim() || testingConnection}
                style={styles.testButton}
              >
                Test Connection
              </Button>
            </View>

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" />
                <Paragraph style={styles.loadingText}>Loading models...</Paragraph>
              </View>
            )}

            {models.length > 0 && (
              <View style={styles.modelSection}>
                <Title style={styles.modelTitle}>Select Model</Title>
                <ScrollView style={styles.modelList} showsVerticalScrollIndicator={false}>
                  {models.slice(0, 20).map((model) => (
                    <Card
                      key={model.id}
                      style={[
                        styles.modelCard,
                        selectedModel === model.id && styles.selectedModelCard,
                      ]}
                      onPress={() => setSelectedModel(model.id)}
                    >
                      <Card.Content>
                        <Paragraph style={styles.modelName}>{model.name}</Paragraph>
                        {model.description && (
                          <Paragraph style={styles.modelDescription}>
                            {model.description.length > 100 
                              ? `${model.description.substring(0, 100)}...` 
                              : model.description}
                          </Paragraph>
                        )}
                      </Card.Content>
                    </Card>
                  ))}
                </ScrollView>
              </View>
            )}

            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Characters')}
              style={styles.characterButton}
              icon="account-group"
            >
              Manage Characters
            </Button>

            <Button
              mode="contained"
              onPress={saveSettings}
              disabled={!apiKey.trim() || loading}
              style={styles.saveButton}
            >
              Save Settings
            </Button>
          </Card.Content>
        </Card>
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
  },
  headerPlaceholder: {
    width: 48,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  description: {
    marginBottom: 16,
    color: '#666',
  },
  input: {
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  testButton: {
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    marginLeft: 8,
  },
  modelSection: {
    marginBottom: 16,
  },
  modelTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  modelList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  modelCard: {
    marginBottom: 8,
  },
  selectedModelCard: {
    backgroundColor: '#e3f2fd',
  },
  modelName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modelDescription: {
    fontSize: 12,
    color: '#666',
  },
  characterButton: {
    marginBottom: 8,
  },
  saveButton: {
    marginTop: 8,
  },
});