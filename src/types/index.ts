export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export type AIModel = OpenRouterModel | OllamaModel;

export type ProviderType = 'openrouter' | 'ollama';

export interface ProviderSettings {
  openrouter?: {
    apiKey: string;
  };
  ollama?: {
    host: string;
    port: number;
  };
}

export interface AppSettings {
  provider: ProviderType;
  providerSettings: ProviderSettings;
  selectedModel: string;
  systemPrompt: string;
  selectedCharacter?: string;
}

export interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Character Card Interfaces
export interface CharacterCardV2Data {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator?: string;
  character_version?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  alternate_greetings?: string[];
  tags?: string[];
  creator_notes?: string;
  talkativeness?: number;
}

export interface CharacterCardV2 {
  spec: 'chara_card_v2';
  spec_version: '2.0';
  data: CharacterCardV2Data;
}

export interface CharacterCardV3Data extends CharacterCardV2Data {
  character_version: string;
  creator: string;
  creator_notes: string;
  extensions?: {
    depth_prompt?: {
      depth: number;
      prompt: string;
      role: string;
    };
    fav?: boolean;
    talkativeness?: string;
    world?: string;
  };
  group_only_greetings?: string[];
  system_prompt: string;
}

export interface CharacterCardV3 {
  spec: 'chara_card_v3';
  spec_version: '3.0';
  data: CharacterCardV3Data;
  avatar?: string;
  chat?: string;
  create_date?: string;
  creatorcomment?: string;
  description?: string;
  fav?: boolean;
  first_mes?: string;
  mes_example?: string;
  name?: string;
  personality?: string;
  scenario?: string;
  tags?: string[];
  talkativeness?: number;
}

export type CharacterCard = CharacterCardV2 | CharacterCardV3;

export interface StoredCharacter {
  id: string;
  name: string;
  card: CharacterCard;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}