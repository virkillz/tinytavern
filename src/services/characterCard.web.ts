import { CharacterCard, CharacterCardV2, CharacterCardV3, StoredCharacter } from '../types';
import extract from 'png-chunks-extract';
import text from 'png-chunk-text';
import { Buffer } from 'buffer';

export class CharacterCardService {
  
  // Web-compatible PNG metadata extraction (rewritten based on working implementation)
  static async extractCharacterFromPNG(file: File): Promise<CharacterCard | null> {
    try {
      console.log('🔍 Extracting character from PNG file:', file.name);
      
      // Read the file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Extract PNG chunks using png-chunks-extract
      const chunks = extract(new Uint8Array(buffer));
      console.log('📦 PNG chunks extracted:', chunks.length);

      // Filter for tEXt chunks and decode them
      const textChunks = chunks
        .filter((chunk) => chunk.name === 'tEXt')
        .map((chunk) => text.decode(chunk.data));

      console.log(`📊 Total tEXt chunks found: ${textChunks.length}`);

      if (textChunks.length === 0) {
        console.error('❌ PNG metadata does not contain any text chunks.');
        return null;
      }

      // Look for ccv3 first (V3 takes precedence)
      const ccv3Index = textChunks.findIndex((chunk) => chunk.keyword.toLowerCase() === 'ccv3');
      
      if (ccv3Index > -1) {
        console.log('🎯 Found ccv3 character data chunk');
        try {
          const jsonStr = Buffer.from(textChunks[ccv3Index].text, 'base64').toString('utf8');
          const characterCard = JSON.parse(jsonStr) as CharacterCard;
          
          if (this.validateCharacterCard(characterCard)) {
            console.log('✅ Successfully extracted V3 character card!');
            return characterCard;
          }
        } catch (e) {
          console.log('❌ Failed to decode ccv3 character data:', e);
        }
      }

      // Look for chara (V2)
      const charaIndex = textChunks.findIndex((chunk) => chunk.keyword.toLowerCase() === 'chara');
      
      if (charaIndex > -1) {
        console.log('🎯 Found chara character data chunk');
        try {
          const jsonStr = Buffer.from(textChunks[charaIndex].text, 'base64').toString('utf8');
          const characterCard = JSON.parse(jsonStr) as CharacterCard;
          
          if (this.validateCharacterCard(characterCard)) {
            console.log('✅ Successfully extracted V2 character card!');
            return characterCard;
          }
        } catch (e) {
          console.log('❌ Failed to decode chara character data:', e);
        }
      }

      console.error('❌ PNG metadata does not contain any character data.');
      return null;
    } catch (error) {
      console.error('💥 Error extracting character from PNG:', error);
      return null;
    }
  }

  // Extract character data from EXIF chunk
  private static extractCharacterFromExifChunk(exifData: Buffer): CharacterCard | null {
    try {
      // Convert buffer to string for pattern matching
      const dataString = exifData.toString('binary');
      
      // Look for "Chara" pattern
      const charaIndex = dataString.indexOf('Chara');
      if (charaIndex !== -1) {
        console.log(`🎯 Found "Chara" at position ${charaIndex}`);
        
        // Extract the base64 data after Chara (skip null byte)
        let base64Start = charaIndex + 6; // Skip "Chara" + null byte
        let base64Data = '';
        
        for (let i = base64Start; i < exifData.length; i++) {
          const char = String.fromCharCode(exifData[i]);
          if (/[A-Za-z0-9+/=]/.test(char)) {
            base64Data += char;
          } else if (base64Data.length > 50) {
            break; // End of base64 data
          }
        }
        
        console.log(`📊 Extracted Chara base64 data length: ${base64Data.length}`);
        
        if (base64Data.length > 100) {
          try {
            const decoded = atob(base64Data);
            const characterCard = JSON.parse(decoded) as CharacterCard;
            
            if (this.validateCharacterCard(characterCard)) {
              console.log(`✅ Successfully parsed character card from Chara EXIF!`);
              return characterCard;
            }
          } catch (e) {
            console.log(`❌ Failed to decode/parse Chara data: ${e}`);
          }
        }
      }
      
      // Look for "Ccv 3" pattern
      const ccvIndex = dataString.indexOf('Ccv 3');
      if (ccvIndex !== -1) {
        console.log(`🎯 Found "Ccv 3" at position ${ccvIndex}`);
        
        // Extract the base64 data after Ccv 3
        let base64Start = ccvIndex + 6; // Skip "Ccv 3" + null byte
        let base64Data = '';
        
        for (let i = base64Start; i < exifData.length; i++) {
          const char = String.fromCharCode(exifData[i]);
          if (/[A-Za-z0-9+/=]/.test(char)) {
            base64Data += char;
          } else if (base64Data.length > 50) {
            break; // End of base64 data
          }
        }
        
        console.log(`📊 Ccv 3 base64 data length: ${base64Data.length}`);
        
        if (base64Data.length > 100) {
          try {
            const decoded = atob(base64Data);
            const characterCard = JSON.parse(decoded) as CharacterCard;
            
            if (this.validateCharacterCard(characterCard)) {
              console.log(`✅ Successfully parsed character card from Ccv 3 EXIF!`);
              return characterCard;
            }
          } catch (e) {
            console.log(`❌ Failed to decode/parse Ccv 3 data: ${e}`);
          }
        }
      }
      
      return null;
    } catch (error) {
      console.log('❌ Error extracting from EXIF chunk:', error);
      return null;
    }
  }

  // Generate system prompt from character card (same as mobile)
  static generateSystemPrompt(character: StoredCharacter, userName: string = 'User'): Array<{role: string, content: string}> {
    const card = character.card;
    const data = card.data;
    const charName = data.name;

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

  // Create character card from manual input (same as mobile)
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

  // Validate character card structure (same as mobile)
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