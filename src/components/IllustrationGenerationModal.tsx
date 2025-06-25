import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Title,
  Paragraph,
  TextInput,
  Button,
  IconButton,
  Card,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImageGenerationService from '../services/imageGeneration';
import { OpenRouterService } from '../services/openrouter';
import { OllamaService } from '../services/ollama';
import { StorageService } from '../utils/storage';
import { AppSettings } from '../types';
import { BookColors, BookTypography } from '../styles/theme';

interface IllustrationGenerationModalProps {
  visible: boolean;
  onClose: () => void;
  onImageGenerated: (imageData: string) => void;
  messageContent?: string;
}

export const IllustrationGenerationModal: React.FC<IllustrationGenerationModalProps> = ({
  visible,
  onClose,
  onImageGenerated,
  messageContent,
}) => {
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatingSuggestion, setGeneratingSuggestion] = useState(false);

  const generateIllustration = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description for the illustration');
      return;
    }

    setGenerating(true);

    try {
      // Generate landscape image for story illustration
      const base64Image = await ImageGenerationService.generateImage(
        description.trim(),
        'horizontal'
      );
      
      // Return the base64 image data
      onImageGenerated(base64Image);
      
      // Reset form and close modal
      setDescription('');
      onClose();
      
      Alert.alert('Success!', 'Illustration has been added to your story.');
    } catch (error) {
      console.error('Error generating illustration:', error);
      Alert.alert(
        'Generation Failed',
        error instanceof Error ? error.message : 'An unknown error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    if (!generating && !generatingSuggestion) {
      setDescription('');
      onClose();
    }
  };

  const generateAISuggestion = async () => {
    if (!messageContent?.trim()) {
      Alert.alert('Error', 'No message content available for AI suggestion');
      return;
    }

    setGeneratingSuggestion(true);

    try {
      const settings = await StorageService.getSettings();
      if (!settings) {
        Alert.alert('Error', 'AI provider not configured. Please check settings.');
        return;
      }

      // Clean the message content by removing existing image markdown
      const cleanContent = messageContent.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '').trim();
      const prompt = `Create an midjourney image generation prompt to illustrate the following story: ${cleanContent}`;
      
      let suggestionText = '';

      if (settings.provider === 'openrouter') {
        if (!settings.providerSettings?.openrouter?.apiKey) {
          throw new Error('OpenRouter API key not configured');
        }

        const service = new OpenRouterService(settings.providerSettings.openrouter.apiKey);
        const apiMessages = [
          { role: 'system', content: 'You are an expert at creating detailed, visual descriptions for illustrations. Create concise but vivid descriptions that focus on setting, characters, mood, and visual elements.' },
          { role: 'user', content: prompt }
        ];

        const response = await service.sendMessage(settings.selectedModel, apiMessages);
        if (response.choices && response.choices.length > 0) {
          suggestionText = response.choices[0].message.content;
        }
      } else if (settings.provider === 'ollama') {
        if (!settings.providerSettings?.ollama?.host) {
          throw new Error('Ollama host not configured');
        }

        const service = new OllamaService(
          settings.providerSettings.ollama.host,
          settings.providerSettings.ollama.port
        );

        const systemPrompt = 'You are an expert at creating detailed, visual descriptions for illustrations. Create concise but vivid descriptions that focus on setting, characters, mood, and visual elements.';
        const messages = [{ id: '1', role: 'user' as const, content: prompt, timestamp: new Date() }];
        
        suggestionText = await service.sendMessage(messages, settings.selectedModel, systemPrompt);
      }

      if (suggestionText) {
        setDescription(suggestionText.trim());
      } else {
        Alert.alert('Error', 'No suggestion generated. Please try again.');
      }
    } catch (error) {
      console.error('Error generating AI suggestion:', error);
      Alert.alert(
        'Suggestion Failed',
        error instanceof Error ? error.message : 'Failed to generate AI suggestion. Please try again.'
      );
    } finally {
      setGeneratingSuggestion(false);
    }
  };

  const useExample = (example: string) => {
    setDescription(example);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView 
          style={styles.flex} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <IconButton
              icon="close"
              size={24}
              onPress={handleClose}
              disabled={generating}
            />
            <Title style={styles.headerTitle}>Generate Illustration</Title>
            <View style={styles.headerPlaceholder} />
          </View>

          {/* Content */}
          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            <Card style={styles.card}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Scene Description</Title>
                <Paragraph style={styles.description}>
                  Describe the scene you want to illustrate in your story. Be detailed to get better results.
                </Paragraph>

                <TextInput
                  label="Describe the illustration..."
                  value={description}
                  onChangeText={setDescription}
                  mode="outlined"
                  multiline
                  numberOfLines={4}
                  style={styles.descriptionInput}
                  placeholder="e.g., A brave knight standing before a dragon in a dark cave"
                  disabled={generating}
                />

                <View style={styles.formatInfo}>
                  <Paragraph style={styles.formatText}>
                    🖼️ Landscape format (768 × 576 pixels)
                  </Paragraph>
                </View>
              </Card.Content>
            </Card>

            {/* AI Suggestion */}
            {messageContent && (
              <Card style={styles.card}>
                <Card.Content>
                  <Title style={styles.sectionTitle}>✨ AI Suggestion</Title>
                  <Paragraph style={styles.description}>
                    Let AI create an illustration description based on your story content:
                  </Paragraph>

                  <Button
                    mode="contained"
                    onPress={generateAISuggestion}
                    disabled={generating || generatingSuggestion}
                    style={styles.suggestionButton}
                    icon={generatingSuggestion ? undefined : "magic-staff"}
                    loading={generatingSuggestion}
                  >
                    {generatingSuggestion ? 'Generating Suggestion...' : 'Generate AI Suggestion'}
                  </Button>

                  {generatingSuggestion && (
                    <View style={styles.suggestionInfo}>
                      <ActivityIndicator size="small" color={BookColors.primary} />
                      <Paragraph style={styles.suggestionText}>
                        Analyzing your story to create the perfect illustration...
                      </Paragraph>
                    </View>
                  )}
                </Card.Content>
              </Card>
            )}

            {/* Tips */}
            <Card style={styles.card}>
              <Card.Content>
                <Title style={styles.sectionTitle}>💡 Tips for Better Illustrations</Title>
                <View style={styles.tipsContainer}>
                  <Paragraph style={styles.tip}>
                    • Describe the setting, characters, and mood
                  </Paragraph>
                  <Paragraph style={styles.tip}>
                    • Include lighting details (sunset, candlelight, etc.)
                  </Paragraph>
                  <Paragraph style={styles.tip}>
                    • Mention the style (medieval, fantasy, realistic)
                  </Paragraph>
                  <Paragraph style={styles.tip}>
                    • Add atmospheric details (misty, dramatic, peaceful)
                  </Paragraph>
                </View>
              </Card.Content>
            </Card>
          </ScrollView>

          {/* Generate Button */}
          <View style={styles.bottomContainer}>
            <Button
              mode="contained"
              onPress={generateIllustration}
              disabled={!description.trim() || generating || generatingSuggestion}
              style={styles.generateButton}
              icon={generating ? undefined : "image-plus"}
              loading={generating}
            >
              {generating ? 'Generating Illustration...' : 'Generate Illustration'}
            </Button>

            {generating && (
              <View style={styles.generatingInfo}>
                <ActivityIndicator size="small" color={BookColors.primary} />
                <Paragraph style={styles.generatingText}>
                  This may take up to 30 seconds...
                </Paragraph>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
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
  headerPlaceholder: {
    width: 48,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
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
  sectionTitle: {
    fontSize: 18,
    fontFamily: BookTypography.serif,
    fontWeight: '700',
    color: BookColors.onSurface,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 16,
  },
  descriptionInput: {
    marginBottom: 16,
    backgroundColor: BookColors.surface,
  },
  formatInfo: {
    alignItems: 'center',
    marginBottom: 8,
  },
  formatText: {
    fontSize: 12,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  suggestionButton: {
    backgroundColor: BookColors.accent,
    borderRadius: 12,
    marginBottom: 16,
  },
  suggestionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  suggestionText: {
    fontSize: 12,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  tipsContainer: {
    gap: 8,
  },
  tip: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    lineHeight: 20,
  },
  bottomContainer: {
    backgroundColor: BookColors.surface,
    padding: 16,
    elevation: 8,
    shadowColor: BookColors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderTopWidth: 1,
    borderTopColor: BookColors.primaryLight,
  },
  generateButton: {
    backgroundColor: BookColors.primary,
    borderRadius: 12,
    paddingVertical: 8,
    elevation: 3,
  },
  generatingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  generatingText: {
    fontSize: 14,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    fontStyle: 'italic',
  },
});