export interface Deck {
  deckId: string;
  deckName: string;
}

export interface Word {
  wordId: string;
  deckId: string;
  original: string;
  translation: string;
  exampleSentence?: string;
}

export interface QuizResult {
  wordId: string;
  known: boolean;
}

