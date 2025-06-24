import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { StoredCharacter, CharacterCard } from '../types';
import { CharacterCardService } from './characterCard';

const CHARACTERS_KEY = 'stored_characters';
const CHARACTER_IMAGES_DIR = `${FileSystem.documentDirectory}character_images/`;

export class CharacterStorageService {
  
  // Initialize storage directory
  static async initializeStorage(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CHARACTER_IMAGES_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CHARACTER_IMAGES_DIR, { intermediates: true });
      }
    } catch (error) {
      console.error('Error initializing character storage:', error);
    }
  }

  // Get all stored characters
  static async getAllCharacters(): Promise<StoredCharacter[]> {
    try {
      const charactersJson = await AsyncStorage.getItem(CHARACTERS_KEY);
      if (!charactersJson) return [];
      
      const characters = JSON.parse(charactersJson);
      return characters.map((char: any) => ({
        ...char,
        createdAt: new Date(char.createdAt),
        updatedAt: new Date(char.updatedAt),
      }));
    } catch (error) {
      console.error('Error getting characters:', error);
      return [];
    }
  }

  // Save a character
  static async saveCharacter(character: Omit<StoredCharacter, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoredCharacter> {
    try {
      await this.initializeStorage();
      
      const characters = await this.getAllCharacters();
      const now = new Date();
      
      const newCharacter: StoredCharacter = {
        ...character,
        id: this.generateId(),
        createdAt: now,
        updatedAt: now,
      };

      characters.push(newCharacter);
      await AsyncStorage.setItem(CHARACTERS_KEY, JSON.stringify(characters));
      
      return newCharacter;
    } catch (error) {
      console.error('Error saving character:', error);
      throw error;
    }
  }

  // Update a character
  static async updateCharacter(id: string, updates: Partial<Pick<StoredCharacter, 'name' | 'card' | 'avatar'>>): Promise<StoredCharacter | null> {
    try {
      const characters = await this.getAllCharacters();
      const characterIndex = characters.findIndex(char => char.id === id);
      
      if (characterIndex === -1) return null;
      
      characters[characterIndex] = {
        ...characters[characterIndex],
        ...updates,
        updatedAt: new Date(),
      };
      
      await AsyncStorage.setItem(CHARACTERS_KEY, JSON.stringify(characters));
      return characters[characterIndex];
    } catch (error) {
      console.error('Error updating character:', error);
      return null;
    }
  }

  // Delete a character
  static async deleteCharacter(id: string): Promise<boolean> {
    try {
      const characters = await this.getAllCharacters();
      const character = characters.find(char => char.id === id);
      
      if (!character) return false;
      
      // Delete avatar file if exists
      if (character.avatar) {
        try {
          const avatarInfo = await FileSystem.getInfoAsync(character.avatar);
          if (avatarInfo.exists) {
            await FileSystem.deleteAsync(character.avatar);
          }
        } catch (avatarError) {
          console.warn('Could not delete avatar file:', avatarError);
        }
      }
      
      const updatedCharacters = characters.filter(char => char.id !== id);
      await AsyncStorage.setItem(CHARACTERS_KEY, JSON.stringify(updatedCharacters));
      
      return true;
    } catch (error) {
      console.error('Error deleting character:', error);
      return false;
    }
  }

  // Get character by ID
  static async getCharacterById(id: string): Promise<StoredCharacter | null> {
    try {
      const characters = await this.getAllCharacters();
      return characters.find(char => char.id === id) || null;
    } catch (error) {
      console.error('Error getting character by ID:', error);
      return null;
    }
  }

  // Save character avatar
  static async saveCharacterAvatar(characterId: string, imageUri: string): Promise<string | null> {
    try {
      await this.initializeStorage();
      
      const filename = `${characterId}_avatar.png`;
      const newPath = `${CHARACTER_IMAGES_DIR}${filename}`;
      
      await FileSystem.copyAsync({
        from: imageUri,
        to: newPath,
      });
      
      return newPath;
    } catch (error) {
      console.error('Error saving character avatar:', error);
      return null;
    }
  }

  // Import character from PNG file
  static async importCharacterFromPNG(fileUri: string, characterCard: CharacterCard): Promise<StoredCharacter> {
    try {
      const characterData = characterCard.data;
      const characterName = characterData.name;
      
      // Save the original PNG as avatar
      const characterId = this.generateId();
      const avatarPath = await this.saveCharacterAvatar(characterId, fileUri);
      
      const newCharacter = await this.saveCharacter({
        name: characterName,
        card: characterCard,
        avatar: avatarPath || undefined,
      });
      
      return newCharacter;
    } catch (error) {
      console.error('Error importing character from PNG:', error);
      throw error;
    }
  }

  // Generate unique ID
  private static generateId(): string {
    return `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initialize default assistant character if none exist
  static async initializeDefaultCharacter(): Promise<void> {
    try {
      const characters = await this.getAllCharacters();
      
      // If there are already characters, don't create default
      if (characters.length > 0) {
        return;
      }

      await this.initializeStorage();
      
      // We'll create the character without copying the asset for now
      // The require() will be handled by React Native's asset system
      const characterId = this.generateId();
      
      // For now, we'll create the character without an avatar file
      // The default.png will be handled via require() when displaying

      // Create default character card
      const defaultCharacterCard = CharacterCardService.createCharacterCard({
        name: 'Assistant',
        description: 'A helpful AI assistant ready to chat, answer questions, and help with various tasks. I\'m knowledgeable, friendly, and always eager to assist you.',
        personality: 'Helpful, knowledgeable, friendly, and professional. I enjoy having conversations and helping users with their questions and tasks.',
        scenario: 'You are chatting with an AI assistant in a casual conversation setting. Feel free to ask questions, discuss topics, or just have a friendly chat.',
        first_mes: 'Hello! I\'m your AI assistant. I\'m here to help with any questions you might have or just to have a friendly conversation. What would you like to talk about today?',
        mes_example: '<START>\n{{user}}: Hello, can you help me?\n{{char}}: Of course! I\'d be happy to help you. What do you need assistance with?\n{{user}}: I need help with planning my day.\n{{char}}: I\'d be glad to help you plan your day! Let\'s start by talking about what you need to accomplish. What are your main priorities or tasks for today?',
        creator: 'System',
        tags: ['assistant', 'helpful', 'default'],
      });

      // Save the default character with a special avatar marker
      const defaultCharacter = await this.saveCharacter({
        name: 'Assistant',
        card: defaultCharacterCard,
        avatar: 'default_asset', // Special marker for default asset
      });

      console.log('✅ Default assistant character created:', defaultCharacter.name);
      
    } catch (error) {
      console.error('Error creating default character:', error);
      
      // Fallback: create character without avatar
      try {
        const defaultCharacterCard = CharacterCardService.createCharacterCard({
          name: 'Assistant',
          description: 'A helpful AI assistant ready to chat, answer questions, and help with various tasks.',
          personality: 'Helpful, knowledgeable, friendly, and professional.',
          scenario: 'You are chatting with an AI assistant in a casual conversation setting.',
          first_mes: 'Hello! I\'m your AI assistant. How can I help you today?',
          mes_example: '<START>\n{{user}}: Hello\n{{char}}: Hi there! How can I assist you today?',
          creator: 'System',
          tags: ['assistant', 'default'],
        });

        await this.saveCharacter({
          name: 'Assistant',
          card: defaultCharacterCard,
        });

        console.log('✅ Default assistant character created (without avatar)');
      } catch (fallbackError) {
        console.error('Error creating fallback default character:', fallbackError);
      }
    }
  }

  // Clear all characters (for debugging)
  static async clearAllCharacters(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CHARACTERS_KEY);
      
      // Clean up image directory
      const dirInfo = await FileSystem.getInfoAsync(CHARACTER_IMAGES_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(CHARACTER_IMAGES_DIR);
      }
    } catch (error) {
      console.error('Error clearing characters:', error);
    }
  }
}