import * as FileSystem from 'expo-file-system';

export class PNGDebugger {
  static async debugPNGFile(fileUri: string): Promise<void> {
    try {
      console.log('🔍 === PNG DEBUG ANALYSIS ===');
      console.log('📁 File URI:', fileUri);
      
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      console.log('📊 File Info:', fileInfo);
      
      if (!fileInfo.exists) {
        console.log('❌ File does not exist!');
        return;
      }
      
      // Read file as base64
      const base64Data = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log('📈 File size (base64):', base64Data.length);
      console.log('📈 Estimated file size (bytes):', Math.floor(base64Data.length * 0.75));
      
      // Convert to binary
      const binaryData = atob(base64Data);
      console.log('📈 Binary data length:', binaryData.length);
      
      // Check PNG signature
      const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
      const actualSignature = [];
      for (let i = 0; i < 8; i++) {
        actualSignature.push(binaryData.charCodeAt(i));
      }
      
      console.log('🔖 Expected PNG signature:', pngSignature);
      console.log('🔖 Actual file signature:', actualSignature);
      
      const isValidPNG = pngSignature.every((byte, index) => byte === actualSignature[index]);
      console.log('✅ Is valid PNG:', isValidPNG);
      
      if (!isValidPNG) {
        console.log('❌ Not a valid PNG file!');
        return;
      }
      
      // Parse PNG chunks
      const chunks = this.parsePNGChunks(binaryData);
      console.log('📦 PNG Chunks found:', chunks.map(c => `${c.type} (${c.length} bytes)`));
      
      // Look for text chunks
      const textChunks = chunks.filter(c => ['tEXt', 'zTXt', 'iTXt'].includes(c.type));
      console.log('📝 Text chunks:', textChunks.length);
      
      for (const textChunk of textChunks) {
        console.log(`📝 Text chunk "${textChunk.type}":`, textChunk.data.substring(0, 200));
        
        // Try to extract key-value pairs
        const nullIndex = textChunk.data.indexOf('\0');
        if (nullIndex !== -1) {
          const key = textChunk.data.substring(0, nullIndex);
          const value = textChunk.data.substring(nullIndex + 1);
          console.log(`🔑 Key: "${key}", Value length: ${value.length}`);
          
          if (key.toLowerCase().includes('char')) {
            console.log('🎭 Found potential character data!');
            console.log('📄 Value preview:', value.substring(0, 500));
            
            // Try to parse as JSON
            try {
              const parsed = JSON.parse(value);
              console.log('✅ Successfully parsed as JSON:', Object.keys(parsed));
            } catch {
              // Try as base64
              try {
                const decoded = atob(value);
                const parsed = JSON.parse(decoded);
                console.log('✅ Successfully parsed as base64 JSON:', Object.keys(parsed));
              } catch {
                console.log('❌ Could not parse as JSON or base64 JSON');
              }
            }
          }
        }
      }
      
      // Search for JSON patterns in the entire file
      console.log('🔍 Searching for JSON patterns in file...');
      const jsonPatterns = [
        /"spec":\s*"chara_card_v[23]"/g,
        /"data":\s*{[^}]*"name":/g,
        /\{"spec":"chara_card_v[23]"/g,
        /"name":\s*"[^"]+"/g
      ];
      
      for (const pattern of jsonPatterns) {
        const matches = binaryData.match(pattern);
        if (matches) {
          console.log(`🎯 Found pattern: ${pattern.source}`, matches.slice(0, 3));
        }
      }
      
      console.log('🔍 === END PNG DEBUG ===');
      
    } catch (error) {
      console.error('💥 PNG Debug Error:', error);
    }
  }
  
  private static parsePNGChunks(binaryData: string): Array<{type: string, length: number, data: string}> {
    const chunks = [];
    let offset = 8; // Skip PNG signature
    
    try {
      while (offset < binaryData.length - 8) {
        // Read chunk length (4 bytes, big-endian)
        const length = (binaryData.charCodeAt(offset) << 24) | 
                      (binaryData.charCodeAt(offset + 1) << 16) |
                      (binaryData.charCodeAt(offset + 2) << 8) | 
                      binaryData.charCodeAt(offset + 3);
        offset += 4;

        // Read chunk type (4 bytes)
        const type = binaryData.substring(offset, offset + 4);
        offset += 4;

        // Read chunk data
        const data = binaryData.substring(offset, offset + length);
        offset += length;

        // Skip CRC (4 bytes)
        offset += 4;

        chunks.push({ type, length, data });

        // Safety check
        if (length > 10000000 || offset > binaryData.length) {
          console.log('⚠️ Stopping chunk parsing due to safety limits');
          break;
        }
      }
    } catch (error) {
      console.error('Error parsing chunks:', error);
    }
    
    return chunks;
  }
}