import { ServerCharacterCardsResponse, ServerCharacterCard, CharacterCard, StoredCharacter, StoredBook, BookCard } from '../types';

const BASE_URL = 'https://a636-110-138-86-119.ngrok-free.app';

export class CharacterCardsBrowserService {
  static async fetchCharacterCards(page: number = 1): Promise<ServerCharacterCardsResponse> {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/cards?page=${page}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ServerCharacterCardsResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching character cards:', error);
      throw error;
    }
  }

  static getImageUrl(imageName: string): string {
    return `${BASE_URL}/images/${imageName}`;
  }

  static parseCharacterMetadata(metadata: string): CharacterCard | null {
    try {
      const parsed = JSON.parse(metadata);
      return parsed as CharacterCard;
    } catch (error) {
      console.error('Error parsing character metadata:', error);
      return null;
    }
  }

  static convertServerCharacterToStored(serverCharacter: ServerCharacterCard): StoredCharacter | null {
    const characterCard = this.parseCharacterMetadata(serverCharacter.metadata);
    if (!characterCard) {
      return null;
    }

    return {
      id: `server_${serverCharacter.id}`,
      name: serverCharacter.name,
      card: characterCard,
      avatar: serverCharacter.image ? this.getImageUrl(serverCharacter.image) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  static convertServerCharacterToBook(serverCharacter: ServerCharacterCard): StoredBook | null {
    const characterCard = this.parseCharacterMetadata(serverCharacter.metadata);
    if (!characterCard) {
      return null;
    }

    // Convert character card to book format
    const bookCard: BookCard = {
      spec: 'interactive_book_v1',
      spec_version: '1.0',
      data: {
        title: characterCard.data.name,
        description: characterCard.data.description,
        author: characterCard.data.creator || 'Unknown Author',
        genre: characterCard.data.tags ? characterCard.data.tags.join(', ') : undefined,
        scenario: characterCard.data.scenario,
        first_page: characterCard.data.first_mes,
        tags: characterCard.data.tags,
        creator_notes: characterCard.data.creator_notes,
        summary: characterCard.data.description,
      },
    };

    return {
      id: `book_server_${serverCharacter.id}`,
      title: characterCard.data.name,
      card: bookCard,
      cover: serverCharacter.image ? this.getImageUrl(serverCharacter.image) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}