import { StoredCharacter, CharacterCard } from '../types';

const CHARACTERS_KEY = 'stored_characters';

export class CharacterStorageService {
  
  // Get all stored characters (using localStorage for web)
  static async getAllCharacters(): Promise<StoredCharacter[]> {
    try {
      const charactersJson = localStorage.getItem(CHARACTERS_KEY);
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
      const characters = await this.getAllCharacters();
      const now = new Date();
      
      const newCharacter: StoredCharacter = {
        ...character,
        id: this.generateId(),
        createdAt: now,
        updatedAt: now,
      };

      characters.push(newCharacter);
      localStorage.setItem(CHARACTERS_KEY, JSON.stringify(characters));
      
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
      
      localStorage.setItem(CHARACTERS_KEY, JSON.stringify(characters));
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
      const updatedCharacters = characters.filter(char => char.id !== id);
      localStorage.setItem(CHARACTERS_KEY, JSON.stringify(updatedCharacters));
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

  // Save character avatar (for web, convert to base64 data URL)
  static async saveCharacterAvatar(characterId: string, file: File): Promise<string | null> {
    try {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          resolve(dataUrl);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('Error saving character avatar:', error);
      return null;
    }
  }

  // Import character from PNG file (web version)
  static async importCharacterFromPNG(file: File, characterCard: CharacterCard): Promise<StoredCharacter> {
    try {
      const characterData = characterCard.data;
      const characterName = characterData.name;
      
      // Save the original PNG as avatar (base64 data URL)
      const avatarDataUrl = await this.saveCharacterAvatar('temp', file);
      
      const newCharacter = await this.saveCharacter({
        name: characterName,
        card: characterCard,
        avatar: avatarDataUrl || undefined,
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

  // Clear all characters
  static async clearAllCharacters(): Promise<void> {
    try {
      localStorage.removeItem(CHARACTERS_KEY);
    } catch (error) {
      console.error('Error clearing characters:', error);
    }
  }
}