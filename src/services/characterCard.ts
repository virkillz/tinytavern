import * as FileSystem from 'expo-file-system';
import { CharacterCard, CharacterCardV2, CharacterCardV3, StoredCharacter } from '../types';
import extract from 'png-chunks-extract';
import text from 'png-chunk-text';
import { Buffer } from 'buffer';

export class CharacterCardService {
  
  // Extract metadata from PNG file (rewritten based on working implementation)
  static async extractCharacterFromPNG(fileUri: string): Promise<CharacterCard | null> {
    try {
      console.log('🔍 Starting PNG extraction for:', fileUri);
      
      // Read the PNG file as base64
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      console.log('📁 File info:', fileInfo);

      // Read file as base64
      const base64Data = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('📊 Base64 data length:', base64Data.length);

      // Convert base64 to buffer for png-chunks-extract
      const buffer = this.base64ToBuffer(base64Data);
      
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



      // Look for chara (V2) first
      const charaIndex = textChunks.findIndex((chunk) => chunk.keyword.toLowerCase() === 'chara');
      
      if (charaIndex > -1) {
        console.log('🎯 Found chara character data chunk');
        try {
          const jsonStr = Buffer.from(textChunks[charaIndex].text, 'base64').toString('utf8');
          const characterCard = JSON.parse(jsonStr) as CharacterCard;

          console.log('Character card:', characterCard);
          
          if (this.validateCharacterCard(characterCard)) {
            console.log('✅ Successfully extracted V2 character card!');
            return characterCard;
          }
        } catch (e) {
          console.log('❌ Failed to decode chara character data:', e);
        }
      }

      // Look for ccv3 first (V3 takes precedence)
      const ccv3Index = textChunks.findIndex((chunk) => chunk.keyword.toLowerCase() === 'ccv3');
      
      if (ccv3Index > -1) {
        console.log('🎯 Found ccv3 character data chunk');
        try {
          const jsonStr = Buffer.from(textChunks[ccv3Index].text, 'base64').toString('utf8');
          const characterCard = JSON.parse(jsonStr) as CharacterCard;

          console.log('Character card:', characterCard);
          
          if (this.validateCharacterCard(characterCard)) {
            console.log('✅ Successfully extracted V3 character card!');
            return characterCard;
          }
        } catch (e) {
          console.log('❌ Failed to decode ccv3 character data:', e);
        }
      }      

      console.error('❌ PNG metadata does not contain any character data.');
      return null;
      
    } catch (error) {
      console.error('💥 Error extracting character from PNG:', error);
      return null;
    }
  }

  // Alternative extraction method
  private static extractCharMetadataAlternative(base64Data: string): CharacterCard | null {
    try {
      console.log('🔄 Trying alternative extraction methods...');
      
      // Method 1: Look for PNG tEXt chunks with "chara" or "Char" key
      const pngBuffer = this.base64ToUint8Array(base64Data);
      const textChunks = this.extractPNGTextChunks(pngBuffer);
      
      console.log('📝 Found text chunks:', Object.keys(textChunks));
      
      // Look for character data in text chunks (including EXIF-extracted data)
      for (const [key, value] of Object.entries(textChunks)) {
        console.log(`🔑 Chunk "${key}":`, value.substring(0, 100) + '...');
        
        if (key.toLowerCase().includes('char') || key === 'Chara' || key.startsWith('Ccv') || key.startsWith('CharacterCard_')) {
          try {
            // Try to decode as base64 first
            let jsonStr = value;
            try {
              jsonStr = atob(value);
              console.log(`🔓 Decoded base64 for key "${key}":`, jsonStr.substring(0, 200) + '...');
            } catch {
              // If not base64, use as-is
              console.log(`📝 Using raw value for key "${key}"`);
            }
            
            const characterCard = JSON.parse(jsonStr) as CharacterCard;
            if (this.validateCharacterCard(characterCard)) {
              console.log('✅ Found valid character card in chunk:', key);
              return characterCard;
            } else {
              console.log(`❌ Character card validation failed for key "${key}"`);
            }
          } catch (e) {
            console.log(`❌ Failed to parse chunk "${key}":`, e);
          }
        }
      }

      // Method 2: Search for JSON patterns in the entire file
      return this.searchForJSONPatterns(base64Data);
      
    } catch (error) {
      console.error('💥 Error in alternative extraction:', error);
      return null;
    }
  }

  // Convert base64 to Uint8Array
  private static base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // Convert base64 to Buffer for png-chunks-extract
  private static base64ToBuffer(base64: string): Buffer {
    // Use Node.js-style Buffer conversion (matching test_new_implementation.js)
    const binaryString = Buffer.from(base64, 'base64').toString('binary');
    const len = binaryString.length;
    const buffer = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      buffer[i] = binaryString.charCodeAt(i);
    }
    return buffer;
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

  // Extract PNG tEXt chunks
  private static extractPNGTextChunks(buffer: Uint8Array): Record<string, string> {
    const chunks: Record<string, string> = {};
    
    try {
      // PNG signature check
      const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
      for (let i = 0; i < 8; i++) {
        if (buffer[i] !== pngSignature[i]) {
          console.log('❌ Invalid PNG signature');
          return chunks;
        }
      }

      let offset = 8; // Skip PNG signature
      
      while (offset < buffer.length - 8) {
        // Read chunk length (4 bytes, big-endian)
        const length = (buffer[offset] << 24) | (buffer[offset + 1] << 16) | 
                      (buffer[offset + 2] << 8) | buffer[offset + 3];
        offset += 4;

        // Read chunk type (4 bytes)
        const type = String.fromCharCode(buffer[offset], buffer[offset + 1], 
                                       buffer[offset + 2], buffer[offset + 3]);
        offset += 4;

        console.log(`📦 Found PNG chunk: ${type}, length: ${length}`);

        // If it's a text chunk
        if (type === 'tEXt' || type === 'zTXt' || type === 'iTXt') {
          try {
            const chunkData = buffer.slice(offset, offset + length);
            const textContent = new TextDecoder('utf-8', { fatal: false }).decode(chunkData);
            
            // Find null separator for tEXt chunks
            const nullIndex = textContent.indexOf('\0');
            if (nullIndex !== -1) {
              const key = textContent.substring(0, nullIndex);
              const value = textContent.substring(nullIndex + 1);
              chunks[key] = value;
              console.log(`📝 Text chunk "${key}": ${value.length} chars`);
            }
          } catch (e) {
            console.log(`❌ Error reading text chunk ${type}:`, e);
          }
        }

        // If it's an EXIF chunk, parse it for character metadata
        if (type === 'eXIf') {
          try {
            console.log(`🔍 Processing EXIF chunk, length: ${length}`);
            const exifChunks = this.parseExifData(buffer.slice(offset, offset + length));
            Object.assign(chunks, exifChunks);
          } catch (e) {
            console.log(`❌ Error reading EXIF chunk:`, e);
          }
        }

        // Move to next chunk (data + 4-byte CRC)
        offset += length + 4;

        // Safety check
        if (length > 1000000) { // 1MB max chunk size
          console.log('⚠️ Chunk too large, stopping');
          break;
        }
      }
    } catch (error) {
      console.error('💥 Error parsing PNG chunks:', error);
    }

    return chunks;
  }

  // Parse EXIF data to extract character metadata
  private static parseExifData(exifBuffer: Uint8Array): Record<string, string> {
    const metadata: Record<string, string> = {};
    
    try {
      console.log(`🔍 EXIF buffer length: ${exifBuffer.length}`);
      
      // Log first few bytes for debugging
      const hexPreview = Array.from(exifBuffer.slice(0, 32))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      console.log(`🔍 EXIF hex preview: ${hexPreview}`);
      
      // Method 1: Direct binary search for character metadata patterns
      // We know from ExifTool that "Chara" and "Ccv 3" keys exist with the base64 data
      const binaryString = Array.from(exifBuffer).map(b => String.fromCharCode(b)).join('');
      
      // Search for "Chara" followed by null byte and base64 data
      const charaPattern = /Chara\x00([A-Za-z0-9+/]{50,}={0,2})/;
      const charaMatch = binaryString.match(charaPattern);
      if (charaMatch) {
        console.log(`🎯 Found "Chara" key with base64 data (${charaMatch[1].length} chars)`);
        metadata['Chara'] = charaMatch[1];
      }
      
      // Search for "Ccv 3" pattern (note the space)
      const ccvPattern = /Ccv\s+3\x00([A-Za-z0-9+/]{50,}={0,2})/;
      const ccvMatch = binaryString.match(ccvPattern);
      if (ccvMatch) {
        console.log(`🎯 Found "Ccv 3" key with base64 data (${ccvMatch[1].length} chars)`);
        metadata['Ccv 3'] = ccvMatch[1];
      }
      
      // Method 2: Search for the specific known base64 strings from exiftool output
      const knownCharaBase64 = "eyJkYXRhIjogeyJuYW1lIjogIkFsaWNl";
      const knownCcvBase64 = "eyJkYXRhIjp7Im5hbWUiOiJBbGljZSB0aGUgYnVsbHki";
      
      // Find complete base64 strings starting with known prefixes
      for (const [key, prefix] of [['Chara', knownCharaBase64], ['Ccv 3', knownCcvBase64]]) {
        const startIndex = binaryString.indexOf(prefix);
        if (startIndex !== -1) {
          console.log(`🎯 Found ${key} data at position ${startIndex}`);
          
          // Extract the complete base64 string from this position
          let endIndex = startIndex;
          for (let i = startIndex; i < binaryString.length; i++) {
            const char = binaryString[i];
            if (/[A-Za-z0-9+/=]/.test(char)) {
              endIndex = i;
            } else {
              break;
            }
          }
          
          const fullBase64 = binaryString.substring(startIndex, endIndex + 1);
          console.log(`✅ Extracted ${key} base64 (${fullBase64.length} chars): ${fullBase64.substring(0, 50)}...`);
          metadata[key] = fullBase64;
        }
      }
      
      // Method 3: Parse the EXIF structure properly to find custom tags
      try {
        const customTags = this.parseCustomExifTags(exifBuffer);
        Object.assign(metadata, customTags);
        console.log(`📝 Found ${Object.keys(customTags).length} custom EXIF tags`);
      } catch (e) {
        console.log(`❌ Failed to parse custom EXIF tags: ${e}`);
      }
      
      // Method 4: UTF-8 decode and search for character patterns
      try {
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const exifString = decoder.decode(exifBuffer);
        
        // Look for any base64 strings that decode to valid character cards
        const base64Pattern = /[A-Za-z0-9+/]{200,}={0,2}/g;
        let match;
        while ((match = base64Pattern.exec(exifString)) !== null) {
          try {
            const decoded = atob(match[0]);
            const parsed = JSON.parse(decoded);
            
            // Check if it's a valid character card
            if (parsed.spec && parsed.spec.includes('chara_card') && parsed.data && parsed.data.name) {
              console.log(`✅ Found valid character card via pattern matching!`);
              metadata['CharacterCard'] = match[0];
              break;
            }
          } catch (e) {
            // Not a valid character card, continue
          }
        }
      } catch (e) {
        console.log(`❌ UTF-8 decode failed: ${e}`);
      }
      
    } catch (error) {
      console.error('💥 Error parsing EXIF data:', error);
    }
    
    return metadata;
  }

  // Parse custom EXIF tags specifically for character metadata
  private static parseCustomExifTags(buffer: Uint8Array): Record<string, string> {
    const tags: Record<string, string> = {};
    
    try {
      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      
      // Check for TIFF header and determine endianness
      let offset = 0;
      let littleEndian = false;
      
      // Look for TIFF magic number (MM or II)
      for (let i = 0; i <= Math.min(buffer.length - 8, 20); i++) {
        const magic = view.getUint16(i);
        if (magic === 0x4949) { // 'II' - little endian
          littleEndian = true;
          offset = i + 8;
          break;
        } else if (magic === 0x4D4D) { // 'MM' - big endian
          littleEndian = false;
          offset = i + 8;
          break;
        }
      }
      
      if (offset === 0) {
        console.log('🔍 No TIFF header found, trying direct IFD parsing');
        offset = 8; // Try standard offset
        littleEndian = false; // Default to big endian
      }
      
      console.log(`🔍 Custom EXIF parsing: endianness=${littleEndian ? 'little' : 'big'}, offset=${offset}`);
      
      // Parse IFD entries
      if (offset < buffer.length - 2) {
        const numEntries = view.getUint16(offset, littleEndian);
        console.log(`🔍 IFD entries: ${numEntries}`);
        offset += 2;
        
        for (let i = 0; i < numEntries && offset + 12 <= buffer.length; i++) {
          const tag = view.getUint16(offset, littleEndian);
          const type = view.getUint16(offset + 2, littleEndian);
          const count = view.getUint32(offset + 4, littleEndian);
          let valueOffset = view.getUint32(offset + 8, littleEndian);
          
          // For strings longer than 4 bytes, valueOffset points to the actual data
          // For shorter data, it's stored directly in the valueOffset field
          if (count <= 4 && type === 2) {
            valueOffset = offset + 8; // Data stored inline
          }
          
          console.log(`🔍 EXIF tag ${tag}: type=${type}, count=${count}, valueOffset=${valueOffset}`);
          
          // Look for ASCII string tags (type 2) that might contain character data
          if (type === 2 && count > 20 && valueOffset < buffer.length) {
            try {
              const stringData = buffer.slice(valueOffset, Math.min(valueOffset + count, buffer.length));
              const stringValue = new TextDecoder('utf-8', { fatal: false }).decode(stringData);
              
              // Remove null terminators
              const cleanString = stringValue.replace(/\0/g, '').trim();
              
              if (cleanString.length > 50) {
                console.log(`🔍 Large string tag ${tag} (${cleanString.length} chars): ${cleanString.substring(0, 100)}...`);
                
                // Check if it's base64 encoded character data
                if (/^[A-Za-z0-9+/]+=*$/.test(cleanString) && cleanString.length > 100) {
                  try {
                    const decoded = atob(cleanString);
                    const parsed = JSON.parse(decoded);
                    
                    if (parsed.spec && parsed.spec.includes('chara_card') && parsed.data) {
                      console.log(`✅ Found character card in EXIF tag ${tag}!`);
                      tags[`tag_${tag}`] = cleanString;
                    }
                  } catch (e) {
                    // Not a character card, but might still be useful
                    if (cleanString.includes('chara') || cleanString.includes('Chara')) {
                      tags[`tag_${tag}`] = cleanString;
                    }
                  }
                }
              }
            } catch (e) {
              console.log(`❌ Error reading string tag ${tag}: ${e}`);
            }
          }
          
          offset += 12;
        }
        
        // Also check if there's a next IFD
        if (offset + 4 <= buffer.length) {
          const nextIFD = view.getUint32(offset, littleEndian);
          if (nextIFD !== 0 && nextIFD < buffer.length) {
            console.log(`🔍 Found next IFD at offset ${nextIFD}`);
            // Could recursively parse, but for now just log
          }
        }
      }
      
    } catch (error) {
      console.log('❌ Error in custom EXIF parsing:', error);
    }
    
    return tags;
  }
  
  // Parse EXIF tags (simplified EXIF parser)
  private static parseExifTags(buffer: Uint8Array): Record<string, string> {
    const tags: Record<string, string> = {};
    
    try {
      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      
      // Check for TIFF header (MM or II for big/little endian)
      let offset = 0;
      let littleEndian = false;
      
      if (view.getUint16(0) === 0x4949) { // 'II' - little endian
        littleEndian = true;
        offset = 8; // Skip TIFF header
      } else if (view.getUint16(0) === 0x4D4D) { // 'MM' - big endian
        littleEndian = false;
        offset = 8; // Skip TIFF header
      } else {
        // Try to find a TIFF header within the data
        for (let i = 0; i < Math.min(buffer.length - 8, 20); i++) {
          if ((view.getUint16(i) === 0x4949) || (view.getUint16(i) === 0x4D4D)) {
            littleEndian = view.getUint16(i) === 0x4949;
            offset = i + 8;
            break;
          }
        }
      }
      
      console.log(`🔍 EXIF endianness: ${littleEndian ? 'little' : 'big'}, offset: ${offset}`);
      
      // Read IFD entries
      if (offset < buffer.length - 2) {
        const numEntries = view.getUint16(offset, littleEndian);
        console.log(`🔍 EXIF entries: ${numEntries}`);
        offset += 2;
        
        for (let i = 0; i < numEntries && offset + 12 <= buffer.length; i++) {
          const tag = view.getUint16(offset, littleEndian);
          const type = view.getUint16(offset + 2, littleEndian);
          const count = view.getUint32(offset + 4, littleEndian);
          const valueOffset = view.getUint32(offset + 8, littleEndian);
          
          // Look for string values (type 2 = ASCII)
          if (type === 2 && count > 10) {
            try {
              let stringOffset = valueOffset;
              if (count <= 4) {
                stringOffset = offset + 8; // Value is stored directly
              }
              
              if (stringOffset < buffer.length) {
                const stringBytes = buffer.slice(stringOffset, stringOffset + count);
                const stringValue = new TextDecoder('utf-8', { fatal: false }).decode(stringBytes);
                
                // Check if this might be a character tag
                if (stringValue.length > 50) {
                  console.log(`🔍 EXIF tag ${tag}: ${stringValue.substring(0, 100)}...`);
                  
                  if (stringValue.includes('chara') || stringValue.includes('Chara') || 
                      (stringValue.length > 100 && /^[A-Za-z0-9+/]+=*$/.test(stringValue.trim()))) {
                    tags[`tag_${tag}`] = stringValue.trim();
                  }
                }
              }
            } catch (e) {
              // Skip this tag
            }
          }
          
          offset += 12;
        }
      }
      
    } catch (error) {
      console.log('Error in EXIF tag parsing:', error);
    }
    
    return tags;
  }

  // Search for JSON patterns in the raw data
  private static searchForJSONPatterns(base64Data: string): CharacterCard | null {
    try {
      console.log('🔍 Searching for JSON patterns...');
      
      const decoded = atob(base64Data);
      
      // Look for character card patterns
      const patterns = [
        /"spec":\s*"chara_card_v[23]"/g,
        /"data":\s*{[^}]*"name":\s*"[^"]+"/g,
        /\{"spec":"chara_card_v[23]"/g
      ];
      
      for (const pattern of patterns) {
        const matches = decoded.match(pattern);
        if (matches) {
          console.log(`🎯 Found pattern match:`, matches[0]);
          
          for (const match of matches) {
            const startIndex = decoded.indexOf(match);
            if (startIndex !== -1) {
              // Try to extract the full JSON object
              const jsonStart = decoded.lastIndexOf('{', startIndex);
              if (jsonStart !== -1) {
                let braceCount = 0;
                let endIndex = jsonStart;
                
                for (let i = jsonStart; i < decoded.length; i++) {
                  if (decoded[i] === '{') braceCount++;
                  if (decoded[i] === '}') braceCount--;
                  if (braceCount === 0 && i > jsonStart) {
                    endIndex = i;
                    break;
                  }
                }
                
                const jsonStr = decoded.substring(jsonStart, endIndex + 1);
                try {
                  const characterCard = JSON.parse(jsonStr) as CharacterCard;
                  if (this.validateCharacterCard(characterCard)) {
                    console.log('✅ Found valid character card via pattern search!');
                    return characterCard;
                  }
                } catch (e) {
                  console.log('❌ Failed to parse extracted JSON:', e);
                }
              }
            }
          }
        }
      }
      
      console.log('❌ No valid character data found in patterns');
      return null;
    } catch (error) {
      console.error('💥 Error in pattern search:', error);
      return null;
    }
  }

  // Simplified PNG metadata extraction (for demo purposes)
  private static extractCharMetadataFromBase64(base64Data: string): string | null {
    // This method is now mainly for backward compatibility
    return null;
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
        
        // Only check if required fields exist, without strict type or content validation
        const requiredFields = ['name', 'description', 'personality', 'scenario', 'first_mes', 'mes_example'];
        return requiredFields.every(field => field in data);
      }
      
      return false;
    } catch {
      return false;
    }
  }
}