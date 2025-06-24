import * as FileSystem from 'expo-file-system';
import { CharacterCard, CharacterCardV2, CharacterCardV3, StoredCharacter } from '../types';

export class CharacterCardService {
  
  // Extract metadata from PNG file
  static async extractCharacterFromPNG(fileUri: string): Promise<CharacterCard | null> {
    try {
      // Read the PNG file as base64
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      // For web/React Native, we'll implement a simplified version
      // In a real implementation, you'd parse PNG metadata chunks
      const base64Data = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Look for the "Char" metadata in the PNG file
      // This is a simplified implementation - in reality you'd need to parse PNG chunks
      const charMetadata = this.extractCharMetadataFromBase64(base64Data);
      
      if (charMetadata) {
        return JSON.parse(atob(charMetadata)) as CharacterCard;
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting character from PNG:', error);
      return null;
    }
  }

  // Simplified PNG metadata extraction (for demo purposes)
  private static extractCharMetadataFromBase64(base64Data: string): string | null {
    try {
      // This is a simplified approach - in real implementation you'd parse PNG chunks
      // Look for a pattern that might contain character data
      const decoded = atob(base64Data);
      
      // Look for JSON-like patterns (this is a basic heuristic)
      const patterns = [
        /"spec":\s*"chara_card_v[23]"/g,
        /"data":\s*{.*"name":/g
      ];
      
      for (const pattern of patterns) {
        const matches = decoded.match(pattern);
        if (matches && matches.length > 0) {
          // Try to extract the full JSON object
          const startIndex = decoded.indexOf('{', decoded.indexOf(matches[0]));
          if (startIndex !== -1) {
            let braceCount = 0;
            let endIndex = startIndex;
            
            for (let i = startIndex; i < decoded.length; i++) {
              if (decoded[i] === '{') braceCount++;
              if (decoded[i] === '}') braceCount--;
              if (braceCount === 0) {
                endIndex = i;
                break;
              }
            }
            
            const jsonStr = decoded.substring(startIndex, endIndex + 1);
            try {
              // Validate it's proper JSON
              JSON.parse(jsonStr);
              return btoa(jsonStr);
            } catch {
              continue;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing base64 metadata:', error);
      return null;
    }
  }

  // Generate system prompt from character card (based on your Elixir pseudocode)
  static generateSystemPrompt(character: StoredCharacter, userName: string = 'User'): Array<{role: string, content: string}> {
    const card = character.card;
    const data = card.data;
    const charName = data.name;

    // Helper function to replace variables like {{char}} and {{user}}
    const replaceVariables = (text: string): string => {
      return text
        .replace(/\{\{char\}\}/gi, charName)
        .replace(/\{\{user\}\}/gi, userName)
        .replace(/\{\{Char\}\}/g, charName)
        .replace(/\{\{User\}\}/g, userName);
    };

    const systemMessages = [
      {
        role: 'system',
        content: `You play a role as ${charName}.\nWrite ${charName}'s next reply in a fictional conversation between you and ${userName}.`
      },
      {
        role: 'system',
        content: `Description:\n${replaceVariables(data.description)}`
      },
      {
        role: 'system',
        content: `${charName}'s personality:\n${replaceVariables(data.personality)}`
      },
      {
        role: 'system',
        content: `Scenario:\n${replaceVariables(data.scenario)}`
      },
      {
        role: 'system',
        content: `${charName}'s message example:\n${replaceVariables(data.mes_example)}`
      },
      {
        role: 'system',
        content: '[Start a new Chat]'
      },
      {
        role: 'assistant',
        content: replaceVariables(data.first_mes)
      }
    ];

    return systemMessages;
  }

  // Create character card from manual input
  static createCharacterCard(data: {
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
    creator?: string;
    tags?: string[];
  }): CharacterCardV3 {
    return {
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: {
        name: data.name,
        description: data.description,
        personality: data.personality,
        scenario: data.scenario,
        first_mes: data.first_mes,
        mes_example: data.mes_example,
        character_version: '1.0',
        creator: data.creator || 'User',
        creator_notes: '',
        system_prompt: '',
        post_history_instructions: '',
        alternate_greetings: [],
        tags: data.tags || [],
        talkativeness: 0.5,
      }
    };
  }

  // Validate character card structure
  static validateCharacterCard(card: any): card is CharacterCard {
    try {
      if (!card || typeof card !== 'object') return false;
      
      if (card.spec === 'chara_card_v2' || card.spec === 'chara_card_v3') {
        const data = card.data;
        if (!data) return false;
        
        const requiredFields = ['name', 'description', 'personality', 'scenario', 'first_mes', 'mes_example'];
        return requiredFields.every(field => typeof data[field] === 'string' && data[field].length > 0);
      }
      
      return false;
    } catch {
      return false;
    }
  }
}