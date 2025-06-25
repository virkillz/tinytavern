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
  Switch,
  SegmentedButtons,
} from 'react-native-paper';
import { OpenRouterService } from '../services/openrouter';
import { OllamaService } from '../services/ollama';
import { StorageService } from '../utils/storage';
import { ProviderType, AIModel, AppSettings, OpenRouterModel, OllamaModel } from '../types';
import { BookColors, BookTypography } from '../styles/theme';

interface Props {
  navigation: any;
}

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const [provider, setProvider] = useState<ProviderType>('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [ollamaHost, setOllamaHost] = useState('localhost');
  const [ollamaPort, setOllamaPort] = useState('');
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant.');
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showFreeOnly, setShowFreeOnly] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await StorageService.getSettings();
      if (settings) {
        setProvider(settings.provider || 'openrouter');
        setSelectedModel(settings.selectedModel);
        setSystemPrompt(settings.systemPrompt || 'You are a helpful AI assistant.');
        
        // Load provider-specific settings
        if (settings.providerSettings?.openrouter?.apiKey) {
          setApiKey(settings.providerSettings.openrouter.apiKey);
        }
        if (settings.providerSettings?.ollama) {
          setOllamaHost(settings.providerSettings.ollama.host);
          setOllamaPort(settings.providerSettings.ollama.port?.toString() || '');
        }

        // Fetch models for current provider
        await fetchModelsForProvider(settings.provider || 'openrouter', settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const fetchModelsForProvider = async (providerType: ProviderType, settings?: AppSettings) => {
    if (providerType === 'openrouter') {
      const key = settings?.providerSettings?.openrouter?.apiKey || apiKey;
      if (key) {
        await fetchOpenRouterModels(key);
      }
    } else if (providerType === 'ollama') {
      const host = settings?.providerSettings?.ollama?.host || ollamaHost;
      const port = settings?.providerSettings?.ollama?.port || (ollamaPort ? parseInt(ollamaPort) : undefined);
      await fetchOllamaModels(host, port);
    }
  };

  const fetchOpenRouterModels = async (key: string) => {
    if (!key.trim()) return;
    
    setLoading(true);
    try {
      const service = new OpenRouterService(key);
      const fetchedModels = await service.getModels();
      setModels(fetchedModels);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch OpenRouter models. Please check your API key.');
      console.error('Error fetching OpenRouter models:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOllamaModels = async (host: string, port?: number) => {
    setLoading(true);
    try {
      const service = new OllamaService(host, port);
      const fetchedModels = await service.getModels();
      setModels(fetchedModels);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch Ollama models. Please check your host and port.');
      console.error('Error fetching Ollama models:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      if (provider === 'openrouter') {
        if (!apiKey.trim()) {
          Alert.alert('Error', 'Please enter your OpenRouter API key first.');
          return;
        }
        await fetchOpenRouterModels(apiKey);
        Alert.alert('Success', 'OpenRouter connection successful! Models loaded.');
      } else if (provider === 'ollama') {
        const port = ollamaPort ? parseInt(ollamaPort) : undefined;
        const service = new OllamaService(ollamaHost, port);
        const isConnected = await service.testConnection();
        if (isConnected) {
          await fetchOllamaModels(ollamaHost, port);
          Alert.alert('Success', 'Ollama connection successful! Models loaded.');
        } else {
          Alert.alert('Error', 'Failed to connect to Ollama. Please check your host and port.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Connection test failed.');
    } finally {
      setTestingConnection(false);
    }
  };

  const saveSettings = async () => {
    // Validate inputs
    if (provider === 'openrouter' && !apiKey.trim()) {
      Alert.alert('Error', 'Please enter your OpenRouter API key.');
      return;
    }

    if (provider === 'ollama') {
      if (!ollamaHost.trim()) {
        Alert.alert('Error', 'Please enter Ollama host.');
        return;
      }
      if (ollamaPort.trim() && isNaN(parseInt(ollamaPort))) {
        Alert.alert('Error', 'Please enter a valid Ollama port number.');
        return;
      }
    }

    if (!selectedModel && models.length > 0) {
      Alert.alert('Error', 'Please select a model.');
      return;
    }

    try {
      const newSettings: AppSettings = {
        provider,
        providerSettings: {
          ...(provider === 'openrouter' && {
            openrouter: { apiKey: apiKey.trim() }
          }),
          ...(provider === 'ollama' && {
            ollama: { 
              host: ollamaHost.trim(), 
              port: ollamaPort ? parseInt(ollamaPort) : undefined
            }
          }),
        },
        selectedModel: selectedModel || (models.length > 0 ? getModelId(models[0]) : ''),
        systemPrompt: systemPrompt.trim() || 'You are a helpful AI assistant.',
      };

      await StorageService.saveSettings(newSettings);
      Alert.alert('Success', 'Settings saved successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Home') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings.');
      console.error('Error saving settings:', error);
    }
  };

  const getModelId = (model: AIModel): string => {
    if ('id' in model) {
      return model.id; // OpenRouter model
    }
    return model.name; // Ollama model
  };

  const getModelName = (model: AIModel): string => {
    return model.name;
  };

  const isOpenRouterModel = (model: AIModel): model is OpenRouterModel => {
    return 'id' in model;
  };

  const filteredModels = models.filter(model => {
    if (provider === 'openrouter' && showFreeOnly) {
      return model.name.toLowerCase().includes('free');
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.navigate('Chat')}
        />
        <Title style={styles.headerTitle}>Providers</Title>
        <View style={styles.headerPlaceholder} />
      </View>
      
      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.card}>
            <Card.Content>
              <Title>AI Provider</Title>
              <Paragraph style={styles.description}>
                Choose your preferred AI provider and configure settings.
              </Paragraph>

              <SegmentedButtons
                value={provider}
                onValueChange={(value) => {
                  setProvider(value as ProviderType);
                  setModels([]);
                  setSelectedModel('');
                }}
                buttons={[
                  {
                    value: 'openrouter',
                    label: 'OpenRouter',
                    icon: 'cloud',
                  },
                  {
                    value: 'ollama',
                    label: 'Ollama',
                    icon: 'server',
                  },
                ]}
                style={styles.providerSelector}
              />

              {provider === 'openrouter' && (
                <TextInput
                  label="OpenRouter API Key"
                  value={apiKey}
                  onChangeText={setApiKey}
                  mode="outlined"
                  secureTextEntry
                  style={styles.input}
                  placeholder="sk-or-..."
                />
              )}

              {provider === 'ollama' && (
                <>
                  <TextInput
                    label="Ollama Host"
                    value={ollamaHost}
                    onChangeText={setOllamaHost}
                    mode="outlined"
                    style={styles.input}
                    placeholder="localhost"
                  />
                  <TextInput
                    label="Ollama Port (optional)"
                    value={ollamaPort}
                    onChangeText={setOllamaPort}
                    mode="outlined"
                    style={styles.input}
                    placeholder="Leave empty for default/HTTPS domains"
                    keyboardType="numeric"
                    helperText="Only needed for localhost or custom ports (e.g., 11434)"
                  />
                </>
              )}

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
                  disabled={testingConnection}
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
                  <View style={styles.modelHeader}>
                    <Title style={styles.modelTitle}>Select Model</Title>
                    {provider === 'openrouter' && (
                      <View style={styles.toggleContainer}>
                        <Paragraph style={styles.toggleLabel}>Free only</Paragraph>
                        <Switch
                          value={showFreeOnly}
                          onValueChange={setShowFreeOnly}
                        />
                      </View>
                    )}
                  </View>
                  <ScrollView style={styles.modelList} showsVerticalScrollIndicator={false}>
                    {filteredModels.map((model) => (
                      <Card
                        key={getModelId(model)}
                        style={[
                          styles.modelCard,
                          selectedModel === getModelId(model) && styles.selectedModelCard,
                        ]}
                        onPress={() => setSelectedModel(getModelId(model))}
                      >
                        <Card.Content>
                          <View style={styles.modelNameRow}>
                            <Paragraph style={styles.modelName}>{getModelName(model)}</Paragraph>
                            {isOpenRouterModel(model) && model.name.toLowerCase().includes('free') && (
                              <Paragraph style={styles.freeTag}>FREE</Paragraph>
                            )}
                          </View>
                          {isOpenRouterModel(model) && model.description && (
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
                mode="contained"
                onPress={saveSettings}
                disabled={loading}
                style={styles.saveButton}
              >
                Save Settings
              </Button>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title>Navigation</Title>
              <Paragraph style={styles.description}>
                Quick access to main features.
              </Paragraph>
              
              <View style={styles.navigationButtons}>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('Characters')}
                  style={styles.navButton}
                  icon="account-group"
                >
                  Manage Characters
                </Button>
                
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('Books')}
                  style={styles.navButton}
                  icon="book-multiple"
                >
                  Interactive Books
                </Button>
                
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('Profile')}
                  style={styles.navButton}
                  icon="account"
                >
                  Profile
                </Button>
              </View>
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
    backgroundColor: BookColors.surface,
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
  },
  headerPlaceholder: {
    width: 48,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
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
  description: {
    marginBottom: 16,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    lineHeight: 22,
  },
  providerSelector: {
    marginBottom: 16,
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
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modelTitle: {
    fontSize: 18,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    marginRight: 8,
    fontSize: 14,
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
  modelNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modelName: {
    fontWeight: 'bold',
    flex: 1,
  },
  freeTag: {
    fontSize: 10,
    color: '#4caf50',
    fontWeight: 'bold',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modelDescription: {
    fontSize: 12,
    color: '#666',
  },
  saveButton: {
    marginTop: 8,
  },
  navigationButtons: {
    gap: 12,
  },
  navButton: {
    marginBottom: 8,
  },
});