import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Title,
  Paragraph,
  TextInput,
  Button,
  IconButton,
  Card,
  SegmentedButtons,
  ActivityIndicator,
} from 'react-native-paper';
import { ImageStorageService } from '../services/imageStorage';
import ImageGenerationService from '../services/imageGeneration';
import { ImageOrientation } from '../types';
import { BookColors, BookTypography } from '../styles/theme';

interface Props {
  navigation: any;
}

export const ImageGenerationScreen: React.FC<Props> = ({ navigation }) => {
  const [prompt, setPrompt] = useState('');
  const [orientation, setOrientation] = useState<ImageOrientation>('vertical');
  const [generating, setGenerating] = useState(false);

  const orientationOptions = [
    {
      value: 'vertical',
      label: 'Portrait',
      icon: 'phone-portrait-outline',
    },
    {
      value: 'horizontal',
      label: 'Landscape',
      icon: 'phone-landscape-outline',
    },
  ];

  const generateImage = async () => {
    if (!prompt.trim()) {
      Alert.alert('Error', 'Please enter a description for the image');
      return;
    }

    setGenerating(true);

    try {
      // Generate the image
      const base64Image = await ImageGenerationService.generateImage(prompt.trim(), orientation);
      
      // Save the image locally
      const savedImage = await ImageStorageService.saveImage(
        base64Image,
        prompt.trim(),
        orientation
      );

      Alert.alert(
        'Success!',
        'Your image has been generated and saved to the gallery.',
        [
          {
            text: 'View Gallery',
            onPress: () => navigation.navigate('Gallery'),
          },
          {
            text: 'Generate Another',
            onPress: () => {
              setPrompt('');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error generating image:', error);
      Alert.alert(
        'Generation Failed',
        error instanceof Error ? error.message : 'An unknown error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setGenerating(false);
    }
  };

  const promptExamples = [
    "A serene mountain landscape at sunset",
    "A futuristic city with flying cars",
    "A cozy coffee shop on a rainy day",
    "An astronaut exploring an alien planet",
    "A magical forest with glowing mushrooms",
    "A vintage steam locomotive crossing a bridge",
  ];

  const useExample = (example: string) => {
    setPrompt(example);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <Title style={styles.headerTitle}>Generate Image</Title>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Image Description</Title>
              <Paragraph style={styles.description}>
                Describe what you want to see in your generated image. Be as detailed as possible for better results.
              </Paragraph>

              <TextInput
                label="Enter your image description..."
                value={prompt}
                onChangeText={setPrompt}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.promptInput}
                placeholder="e.g., A beautiful sunset over mountains with a lake in the foreground"
                disabled={generating}
              />

              <Title style={styles.sectionTitle}>Orientation</Title>
              <SegmentedButtons
                value={orientation}
                onValueChange={(value) => setOrientation(value as ImageOrientation)}
                buttons={orientationOptions}
                style={styles.orientationSelector}
                disabled={generating}
              />

              <View style={styles.orientationInfo}>
                <Paragraph style={styles.orientationText}>
                  {orientation === 'vertical' ? '📱 576 × 768 pixels' : '🖥️ 768 × 576 pixels'}
                </Paragraph>
              </View>
            </Card.Content>
          </Card>

          {/* Example Prompts */}
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Example Prompts</Title>
              <Paragraph style={styles.description}>
                Tap any example below to use it as your prompt:
              </Paragraph>

              <View style={styles.examplesContainer}>
                {promptExamples.map((example, index) => (
                  <Button
                    key={index}
                    mode="outlined"
                    onPress={() => useExample(example)}
                    style={styles.exampleButton}
                    disabled={generating}
                    compact
                  >
                    {example}
                  </Button>
                ))}
              </View>
            </Card.Content>
          </Card>

          {/* Generation Tips */}
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>💡 Tips for Better Results</Title>
              <View style={styles.tipsContainer}>
                <Paragraph style={styles.tip}>
                  • Be specific about colors, lighting, and mood
                </Paragraph>
                <Paragraph style={styles.tip}>
                  • Mention the style (e.g., "photorealistic", "watercolor", "cartoon")
                </Paragraph>
                <Paragraph style={styles.tip}>
                  • Include details about the setting and atmosphere
                </Paragraph>
                <Paragraph style={styles.tip}>
                  • Use descriptive adjectives (beautiful, dramatic, peaceful)
                </Paragraph>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>

        <View style={styles.bottomContainer}>
          <Button
            mode="contained"
            onPress={generateImage}
            disabled={!prompt.trim() || generating}
            style={styles.generateButton}
            icon={generating ? undefined : "creation"}
            loading={generating}
          >
            {generating ? 'Generating Image...' : 'Generate Image'}
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
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
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
  promptInput: {
    marginBottom: 24,
    backgroundColor: BookColors.surface,
  },
  orientationSelector: {
    marginBottom: 8,
  },
  orientationInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  orientationText: {
    fontSize: 12,
    fontFamily: BookTypography.serif,
    color: BookColors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  examplesContainer: {
    gap: 8,
  },
  exampleButton: {
    marginBottom: 8,
    borderColor: BookColors.primaryLight,
    borderRadius: 10,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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