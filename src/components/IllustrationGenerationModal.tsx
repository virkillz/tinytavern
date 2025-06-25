import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
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
import { BookColors, BookTypography } from '../styles/theme';

interface IllustrationGenerationModalProps {
  visible: boolean;
  onClose: () => void;
  onImageGenerated: (imageData: string) => void;
}

export const IllustrationGenerationModal: React.FC<IllustrationGenerationModalProps> = ({
  visible,
  onClose,
  onImageGenerated,
}) => {
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);

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
    if (!generating) {
      setDescription('');
      onClose();
    }
  };

  const examplePrompts = [
    "A medieval castle on a hill at sunset",
    "A mysterious forest with glowing lights",
    "An ancient library filled with magical books",
    "A bustling marketplace in a fantasy city",
    "A peaceful village by a crystal lake",
    "A dark dungeon with torches on the walls"
  ];

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
          <View style={styles.content}>
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

            {/* Example Prompts */}
            <Card style={styles.card}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Example Scenes</Title>
                <Paragraph style={styles.description}>
                  Tap any example below to use it as your prompt:
                </Paragraph>

                <View style={styles.examplesContainer}>
                  {examplePrompts.map((example, index) => (
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
          </View>

          {/* Generate Button */}
          <View style={styles.bottomContainer}>
            <Button
              mode="contained"
              onPress={generateIllustration}
              disabled={!description.trim() || generating}
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