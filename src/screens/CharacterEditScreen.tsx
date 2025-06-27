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
  Dialog,
  Portal,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { CharacterStorageService } from '../services/characterStorage';
import { CharacterCardService } from '../services/characterCard';
import ImageGenerationService from '../services/imageGeneration';
import { StoredCharacter } from '../types';

interface Props {
  navigation: any;
  route: {
    params: {
      characterId: string | null;
    };
  };
}

export const CharacterEditScreen: React.FC<Props> = ({ navigation, route }) => {
  const { characterId } = route.params;
  const isEditing = characterId !== null;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [character, setCharacter] = useState<StoredCharacter | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [personality, setPersonality] = useState('');
  const [scenario, setScenario] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [messageExample, setMessageExample] = useState('');
  const [creator, setCreator] = useState('');
  const [tags, setTags] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [promptDialogVisible, setPromptDialogVisible] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  useEffect(() => {
    if (isEditing) {
      loadCharacter();
    }
  }, [characterId]);

  const loadCharacter = async () => {
    if (!characterId) return;
    
    try {
      setLoading(true);
      const char = await CharacterStorageService.getCharacterById(characterId);
      if (char) {
        setCharacter(char);
        setName(char.card.data.name);
        setDescription(char.card.data.description);
        setPersonality(char.card.data.personality);
        setScenario(char.card.data.scenario);
        setFirstMessage(char.card.data.first_mes);
        setMessageExample(char.card.data.mes_example);
        setCreator(char.card.data.creator || '');
        setTags(char.card.data.tags?.join(', ') || '');
        setAvatarUri(char.avatar || null);
      } else {
        Alert.alert('Error', 'Character not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading character:', error);
      Alert.alert('Error', 'Failed to load character');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const showImageSourceChoice = () => {
    Alert.alert(
      'Choose Image Source',
      'How would you like to add an avatar for this character?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Generate Image',
          onPress: () => generateAvatar(),
        },
        {
          text: 'Upload from Gallery',
          onPress: () => pickAvatarFromGallery(),
        },
      ]
    );
  };

  const pickAvatarFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking avatar:', error);
      Alert.alert('Error', 'Failed to pick avatar');
    }
  };

  const generateAvatar = async () => {
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

      // Create a prompt based on character details
      let prompt = '';
      if (name.trim()) {
        prompt = name.trim();
      }
      if (description.trim()) {
        prompt += `, ${description.trim()}`;
      }
      if (personality.trim()) {
        prompt += `, personality: ${personality.trim()}`;
      }

      // Fallback prompt if no details provided yet
      if (!prompt) {
        prompt = 'portrait of a character, fantasy style, detailed artwork';
      } else {
        prompt = `portrait of ${prompt}, detailed artwork, character design`;
      }

      // Show prompt review dialog
      setGeneratedPrompt(prompt);
      setPromptDialogVisible(true);
    } catch (error) {
      console.error('Error preparing avatar generation:', error);
      Alert.alert('Error', 'Failed to prepare avatar generation');
    }
  };

  const executeAvatarGeneration = async () => {
    try {
      setPromptDialogVisible(false);
      setGeneratingImage(true);

      const base64Image = await ImageGenerationService.generateImage(generatedPrompt, 'vertical');
      
      // Convert base64 to file URI
      const fileName = `generated_avatar_${Date.now()}.png`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, base64Image, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setAvatarUri(fileUri);
      Alert.alert('Success', 'Avatar generated successfully!');
    } catch (error) {
      console.error('Error generating avatar:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to generate avatar');
    } finally {
      setGeneratingImage(false);
    }
  };

  const saveCharacter = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Character name is required');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Character description is required');
      return;
    }
    if (!personality.trim()) {
      Alert.alert('Validation Error', 'Character personality is required');
      return;
    }
    if (!scenario.trim()) {
      Alert.alert('Validation Error', 'Character scenario is required');
      return;
    }
    if (!firstMessage.trim()) {
      Alert.alert('Validation Error', 'First message is required');
      return;
    }

    try {
      setSaving(true);

      // Parse tags
      const tagArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Create character card
      const characterCard = CharacterCardService.createCharacterCard({
        name: name.trim(),
        description: description.trim(),
        personality: personality.trim(),
        scenario: scenario.trim(),
        first_mes: firstMessage.trim(),
        mes_example: messageExample.trim() || 'No example provided.',
        creator: creator.trim() || 'User',
        tags: tagArray,
      });

      if (isEditing && characterId) {
        // Update existing character
        let finalAvatarUri = character?.avatar;
        
        if (avatarUri && avatarUri !== character?.avatar) {
          finalAvatarUri = await CharacterStorageService.saveCharacterAvatar(characterId, avatarUri);
        }

        await CharacterStorageService.updateCharacter(characterId, {
          name: name.trim(),
          card: characterCard,
          avatar: finalAvatarUri || undefined,
        });

        Alert.alert('Success', 'Character updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Create new character
        const newCharacter = await CharacterStorageService.saveCharacter({
          name: name.trim(),
          card: characterCard,
          avatar: undefined,
        });

        // Save avatar if provided
        if (avatarUri) {
          const savedAvatarPath = await CharacterStorageService.saveCharacterAvatar(newCharacter.id, avatarUri);
          if (savedAvatarPath) {
            await CharacterStorageService.updateCharacter(newCharacter.id, {
              avatar: savedAvatarPath,
            });
          }
        }

        Alert.alert('Success', 'Character created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error saving character:', error);
      Alert.alert('Error', 'Failed to save character');
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
          <Title style={styles.headerTitle}>Loading...</Title>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Paragraph style={styles.loadingText}>Loading character...</Paragraph>
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
          {isEditing ? 'Edit Character' : 'New Character'}
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
              <Title>Character Details</Title>
              
              {/* Avatar */}
              <View style={styles.avatarSection}>
                <TouchableOpacity 
                  onPress={showImageSourceChoice} 
                  style={styles.avatarContainer}
                  disabled={generatingImage}
                >
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      {generatingImage ? (
                        <>
                          <ActivityIndicator size="large" color="#666" />
                          <Paragraph style={styles.avatarText}>Generating...</Paragraph>
                        </>
                      ) : (
                        <>
                          <IconButton icon="camera" size={32} />
                          <Paragraph style={styles.avatarText}>Tap to add avatar</Paragraph>
                        </>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
                {avatarUri && !generatingImage && (
                  <TouchableOpacity 
                    onPress={showImageSourceChoice}
                    style={styles.changeAvatarButton}
                  >
                    <Paragraph style={styles.changeAvatarText}>Change Avatar</Paragraph>
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                label="Name *"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                placeholder="Character name"
              />

              <TextInput
                label="Description *"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                placeholder="Describe the character's appearance, background, etc."
              />

              <TextInput
                label="Personality *"
                value={personality}
                onChangeText={setPersonality}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                placeholder="Describe the character's personality traits"
              />

              <TextInput
                label="Scenario *"
                value={scenario}
                onChangeText={setScenario}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                placeholder="Describe the setting and scenario"
              />

              <TextInput
                label="First Message *"
                value={firstMessage}
                onChangeText={setFirstMessage}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
                placeholder="The character's opening message"
              />

              <TextInput
                label="Message Example"
                value={messageExample}
                onChangeText={setMessageExample}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
                placeholder="Example dialogue to show the character's speaking style"
              />

              <TextInput
                label="Creator"
                value={creator}
                onChangeText={setCreator}
                mode="outlined"
                style={styles.input}
                placeholder="Your name or username"
              />

              <TextInput
                label="Tags"
                value={tags}
                onChangeText={setTags}
                mode="outlined"
                style={styles.input}
                placeholder="fantasy, adventure, romance (comma separated)"
              />

              <Button
                mode="contained"
                onPress={saveCharacter}
                disabled={saving}
                loading={saving}
                style={styles.saveButton}
              >
                {isEditing ? 'Update Character' : 'Create Character'}
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Prompt Review Dialog */}
      <Portal>
        <Dialog 
          visible={promptDialogVisible} 
          onDismiss={() => setPromptDialogVisible(false)}
          style={styles.promptDialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Review Generated Prompt</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogDescription}>
              Review and edit the AI prompt that will be used to generate your character's avatar:
            </Paragraph>
            <TextInput
              label="AI Prompt"
              value={generatedPrompt}
              onChangeText={setGeneratedPrompt}
              mode="outlined"
              multiline
              numberOfLines={4}
              style={styles.promptInput}
              placeholder="Enter prompt for AI image generation..."
            />
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button 
              onPress={() => setPromptDialogVisible(false)}
              style={styles.dialogButton}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={executeAvatarGeneration}
              style={styles.dialogButton}
              disabled={!generatedPrompt.trim()}
            >
              Generate Avatar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  changeAvatarButton: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  changeAvatarText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 16,
  },
  promptDialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  dialogDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  promptInput: {
    marginBottom: 8,
  },
  dialogActions: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  dialogButton: {
    marginHorizontal: 4,
  },
});