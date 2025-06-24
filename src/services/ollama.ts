import { OllamaModel, Message, ChatResponse } from '../types';

export class OllamaService {
  private host: string;
  private port: number;

  constructor(host: string = 'localhost', port: number = 11434) {
    this.host = host;
    this.port = port;
  }

  private get baseUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  async getModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      throw error;
    }
  }

  async sendMessage(
    messages: Message[],
    model: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      // Convert messages to Ollama format
      const ollamaMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add system message if provided
      if (systemPrompt) {
        ollamaMessages.unshift({
          role: 'system',
          content: systemPrompt,
        });
      }

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: ollamaMessages,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.message?.content || '';
    } catch (error) {
      console.error('Error sending message to Ollama:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      console.error('Ollama connection test failed:', error);
      return false;
    }
  }

  // Get model info for a specific model
  async getModelInfo(model: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: model }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get model info: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting Ollama model info:', error);
      throw error;
    }
  }

  // Pull a model from Ollama registry
  async pullModel(model: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: model }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.status}`);
      }

      // This is a streaming endpoint, but we'll just check if it started successfully
      console.log(`Started pulling model: ${model}`);
    } catch (error) {
      console.error('Error pulling Ollama model:', error);
      throw error;
    }
  }
}