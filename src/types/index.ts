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
  isKnown?: boolean; // Kullanıcının kelimeyi bilip bilmediğini takip eder
}

export interface QuizResult {
  wordId: string;
  known: boolean;
}

