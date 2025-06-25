/**
 * Utility functions for replacing template variables in text content
 * Supports both character chat and interactive book contexts
 */

export interface VariableContext {
  characterName?: string;
  userName?: string;
  bookTitle?: string;
  authorName?: string;
}

/**
 * Replace template variables in text content
 * Supports: {{char}}, {{user}}, {{book}}, {{author}}
 */
export const replaceVariables = (
  text: string, 
  context: VariableContext
): string => {
  if (!text) return text;

  let result = text;

  // Replace character name variables
  if (context.characterName) {
    result = result.replace(/\{\{char\}\}/gi, context.characterName);
  }

  // Replace user name variables  
  if (context.userName) {
    result = result.replace(/\{\{user\}\}/gi, context.userName);
  }

  // Replace book title variables (for interactive books)
  if (context.bookTitle) {
    result = result.replace(/\{\{book\}\}/gi, context.bookTitle);
  }

  // Replace author name variables (for interactive books)
  if (context.authorName) {
    result = result.replace(/\{\{author\}\}/gi, context.authorName);
  }

  return result;
};

/**
 * Replace variables specifically for character chat context
 */
export const replaceCharacterVariables = (
  text: string,
  characterName: string,
  userName: string
): string => {
  return replaceVariables(text, {
    characterName,
    userName,
  });
};

/**
 * Replace variables specifically for interactive book context
 * In books, {{char}} refers to the main character/protagonist of the story
 * which is typically the book title or main character name
 */
export const replaceBookVariables = (
  text: string,
  bookTitle: string,
  userName: string,
  authorName?: string
): string => {
  return replaceVariables(text, {
    characterName: bookTitle, // {{char}} in books refers to the book's main character
    userName,
    bookTitle,
    authorName,
  });
};

/**
 * Check if text contains any template variables
 */
export const hasTemplateVariables = (text: string): boolean => {
  if (!text) return false;
  
  const variablePattern = /\{\{(char|user|book|author)\}\}/gi;
  return variablePattern.test(text);
};

/**
 * Get list of template variables found in text
 */
export const getTemplateVariables = (text: string): string[] => {
  if (!text) return [];
  
  const variables: string[] = [];
  const variablePattern = /\{\{(char|user|book|author)\}\}/gi;
  let match;
  
  while ((match = variablePattern.exec(text)) !== null) {
    if (!variables.includes(match[0])) {
      variables.push(match[0]);
    }
  }
  
  return variables;
};