import { ChatResponse, OpenAIModel } from '../types';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

export class OpenAIService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getModels(): Promise<OpenAIModel[]> {
    try {
      const response = await fetch(`${OPENAI_BASE_URL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      // Filter to only show chat completion models
      const chatModels = (data.data || []).filter((model: OpenAIModel) => 
        model.id.includes('gpt') || 
        model.id.includes('chat') ||
        model.id.includes('o1')
      );
      return chatModels;
    } catch (error) {
      console.error('Error fetching OpenAI models:', error);
      throw error;
    }
  }

  async sendMessage(model: string, messages: Array<{ role: string; content: string }>, systemPrompt?: string): Promise<ChatResponse> {
    try {
      console.log('Sending message with OpenAI model:', model);
      console.log('Messages:', messages);
      console.log('System prompt:', systemPrompt);
      
      // Prepare messages with system prompt if provided
      const allMessages = systemPrompt 
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages;
      
      const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: allMessages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      console.log('OpenAI Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API Error Response:', errorText);
        throw new Error(`Failed to send message: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('OpenAI API Response:', data);
      return data;
    } catch (error) {
      console.error('Error sending message to OpenAI:', error);
      if (error instanceof Error) {
        throw new Error(`OpenAI API Error: ${error.message}`);
      }
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${OPENAI_BASE_URL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}