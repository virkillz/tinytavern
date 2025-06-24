const fs = require('fs');
const extract = require('png-chunks-extract');
const text = require('png-chunk-text');
const { Buffer } = require('buffer');

// Test the new implementation exactly as written
function testNewImplementation() {
  try {
    console.log('🔍 Testing new PNG extraction implementation...');
    
    // Read the PNG file
    const base64Data = fs.readFileSync('./test_image.PNG').toString('base64');
    console.log('📊 Base64 data length:', base64Data.length);

    // Convert base64 to buffer (same as in the app)
    const binaryString = Buffer.from(base64Data, 'base64').toString('binary');
    const len = binaryString.length;
    const buffer = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      buffer[i] = binaryString.charCodeAt(i);
    }
    
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
        const characterCard = JSON.parse(jsonStr);
        
        console.log('✅ Successfully extracted V3 character card!');
        console.log('🎭 Character name:', characterCard.data?.name);
        console.log('📋 Character spec:', characterCard.spec);
        return characterCard;
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
        const characterCard = JSON.parse(jsonStr);
        
        console.log('✅ Successfully extracted V2 character card!');
        console.log('🎭 Character name:', characterCard.data?.name);
        console.log('📋 Character spec:', characterCard.spec);
        return characterCard;
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

testNewImplementation();