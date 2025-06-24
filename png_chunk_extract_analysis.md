> This source code have ability to parse png file and extract the "Chara" from exif metadata. The content of "Chara" is base64 encoded json. Is there any external library it used to get the metadata
> from the PNG file? How does it works? I suspect it have something to do with this file @character-card-parser.js
> ⎿  Read character-card-parser.js (99 lines)

⏺ Yes, this code uses two external libraries to parse PNG metadata:

1. png-chunks-extract (line 5) - Extracts chunks from PNG files
2. png-chunk-text (line 6) - Decodes/encodes tEXt chunks in PNG files

The code works by:

1. Using png-chunks-extract to extract all chunks from the PNG file (line 55)
2. Filtering for tEXt chunks and decoding them with PNGtext.decode() (line 57)
3. Looking for chunks with keywords "ccv3" or "chara" (lines 64, 70)
4. Base64 decoding the text content to get the JSON character data (lines 67, 73)

The "Chara" metadata is stored in PNG tEXt chunks with the keyword "chara" (v2 format) or "ccv3" (v3 format), with the JSON data base64-encoded as the text value.
