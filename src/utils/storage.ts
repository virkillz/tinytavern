import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, Message } from '../types';

const SETTINGS_KEY = 'app_settings';
const MESSAGES_KEY = 'chat_messages';
const USER_PROFILE_KEY = 'user_profile';

export const StorageService = {
  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  },

  async getSettings(): Promise<AppSettings | null> {
    try {
      const settings = await AsyncStorage.getItem(SETTINGS_KEY);
      if (!settings) return null;
      
      const parsed = JSON.parse(settings);
      
      // Migration: Convert old settings format to new format
      if (parsed.apiKey && !parsed.provider) {
        const migratedSettings: AppSettings = {
          provider: 'openrouter',
          providerSettings: {
            openrouter: {
              apiKey: parsed.apiKey,
            },
          },
          selectedModel: parsed.selectedModel || '',
          systemPrompt: parsed.systemPrompt || 'You are a helpful AI assistant.',
          selectedCharacter: parsed.selectedCharacter,
        };
        
        // Save migrated settings
        await this.saveSettings(migratedSettings);
        return migratedSettings;
      }
      
      return parsed;
    } catch (error) {
      console.error('Error getting settings:', error);
      return null;
    }
  },

  async saveMessages(messages: Message[], characterId?: string): Promise<void> {
    try {
      const key = characterId ? `${MESSAGES_KEY}_${characterId}` : MESSAGES_KEY;
      await AsyncStorage.setItem(key, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving messages:', error);
      throw error;
    }
  },

  async getMessages(characterId?: string): Promise<Message[]> {
    try {
      const key = characterId ? `${MESSAGES_KEY}_${characterId}` : MESSAGES_KEY;
      const messages = await AsyncStorage.getItem(key);
      return messages ? JSON.parse(messages) : [];
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  },

  async clearMessages(characterId?: string): Promise<void> {
    try {
      const key = characterId ? `${MESSAGES_KEY}_${characterId}` : MESSAGES_KEY;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing messages:', error);
      throw error;
    }
  },

  // Legacy method for backward compatibility - clears all chat history
  async clearAllMessages(): Promise<void> {
    try {
      // Get all keys and remove message-related ones
      const allKeys = await AsyncStorage.getAllKeys();
      const messageKeys = allKeys.filter(key => key.startsWith(MESSAGES_KEY));
      await AsyncStorage.multiRemove(messageKeys);
    } catch (error) {
      console.error('Error clearing all messages:', error);
      throw error;
    }
  },

  async saveUserProfile(profile: { name: string; avatar?: string }): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  },

  async getUserProfile(): Promise<{ name: string; avatar?: string } | null> {
    try {
      const profile = await AsyncStorage.getItem(USER_PROFILE_KEY);
      return profile ? JSON.parse(profile) : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },
};