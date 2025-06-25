import { ImageGenerationRequest, ImageGenerationResponse, ImageOrientation } from '../types';

export class ImageGenerationService {
  private baseUrl: string = 'https://kitten-well-lemur.ngrok-free.app/sdapi/v1';

  constructor() {}

  async generateImage(
    prompt: string, 
    orientation: ImageOrientation = 'vertical'
  ): Promise<string> {
    const width = orientation === 'vertical' ? 576 : 768;
    const height = orientation === 'vertical' ? 768 : 576;

    const requestData: ImageGenerationRequest = {
      prompt: prompt + ' <lora:LCM_Lora_SD15:0.97>',
      width,
      height,
      steps: 8,
      cfg_scale: 1.0,
      sampler_index: 'LCM',
      restore_faces: true,
    };

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 50000); // 50 seconds timeout

      const response = await fetch(`${this.baseUrl}/txt2img`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ImageGenerationResponse = await response.json();

      if (!data.images || data.images.length === 0) {
        throw new Error('No images generated');
      }

      // Return the first (and typically only) generated image as base64
      return data.images[0];
    } catch (error) {
      console.error('Error generating image:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Image generation timed out. Please try again.');
        }
        throw new Error(`Failed to generate image: ${error.message}`);
      } else {
        throw new Error('Failed to generate image: Unknown error');
      }
    }
  }

  async setModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/options`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sd_model_checkpoint: modelName,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error setting model:', error);
      throw new Error('Failed to set model');
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/sd-models`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const models = await response.json();
      return models.map((model: any) => model.title || model.name);
    } catch (error) {
      console.error('Error getting models:', error);
      throw new Error('Failed to get available models');
    }
  }

  async getOptions(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/options`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting options:', error);
      throw new Error('Failed to get options');
    }
  }
}

export default new ImageGenerationService();