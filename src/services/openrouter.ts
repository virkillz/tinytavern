import { ChatResponse, OpenRouterModel } from '../types';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export class OpenRouterService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getModels(): Promise<OpenRouterModel[]> {
    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  }

  async sendMessage(model: string, messages: Array<{ role: string; content: string }>): Promise<ChatResponse> {
    try {
      console.log('Sending message with model:', model);
      console.log('Messages:', messages);
      
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:8081',
          'X-Title': 'React Native Chat App',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to send message: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      if (error instanceof Error) {
        throw new Error(`API Error: ${error.message}`);
      }
      throw error;
    }
  }
}