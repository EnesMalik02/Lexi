'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Word, Deck } from '@/types';
import { ArrowLeftIcon, PlusIcon, TrashIcon, PlayIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

export default function DeckDetail() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  const deckId = params.deckId as string;
  
  const [deck, setDeck] = useState<Deck | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddWord, setShowAddWord] = useState(false);
  const [newWord, setNewWord] = useState({
    original: '',
    translation: '',
    exampleSentence: '',
  });

  useEffect(() => {
    if (currentUser && deckId) {
      loadDeck();
      loadWords();
    }
  }, [currentUser, deckId]);

  async function loadDeck() {
    if (!currentUser || !deckId) return;

    try {
      const deckDoc = await getDoc(doc(db, `users/${currentUser.uid}/decks/${deckId}`));
      if (deckDoc.exists()) {
        setDeck({
          deckId: deckDoc.id,
          deckName: deckDoc.data().deckName,
        });
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Deck yükleme hatası:', error);
      router.push('/dashboard');
    }
  }

  async function loadWords() {
    if (!currentUser || !deckId) return;

    try {
      const wordsRef = collection(db, `users/${currentUser.uid}/words`);
      const wordsQuery = query(wordsRef, where('deckId', '==', deckId));
      const querySnapshot = await getDocs(wordsQuery);
      const wordsData: Word[] = [];
      
      querySnapshot.forEach((doc) => {
        wordsData.push({
          wordId: doc.id,
          deckId: doc.data().deckId,
          original: doc.data().original,
          translation: doc.data().translation,
          exampleSentence: doc.data().exampleSentence,
        });
      });
      
      setWords(wordsData);
    } catch (error) {
      console.error('Kelime yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddWord(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !deckId || !newWord.original.trim() || !newWord.translation.trim()) return;

    try {
      const wordsRef = collection(db, `users/${currentUser.uid}/words`);
      await addDoc(wordsRef, {
        deckId,
        original: newWord.original.trim(),
        translation: newWord.translation.trim(),
        exampleSentence: newWord.exampleSentence.trim() || null,
      });
      
      // Input alanlarını temizle ama modal açık kalsın
      setNewWord({
        original: '',
        translation: '',
        exampleSentence: '',
      });
      loadWords();
      
      // İlk input'a otomatik focus
      setTimeout(() => {
        const firstInput = document.querySelector<HTMLInputElement>('input[name="original"]');
        if (firstInput) firstInput.focus();
      }, 0);
    } catch (error) {
      console.error('Kelime ekleme hatası:', error);
      alert('Kelime eklenirken bir hata oluştu');
    }
  }

  async function handleDeleteWord(wordId: string) {
    if (!currentUser) return;
    if (!confirm('Bu kelimeyi silmek istediğinize emin misiniz?')) return;

    try {
      await deleteDoc(doc(db, `users/${currentUser.uid}/words/${wordId}`));
      loadWords();
    } catch (error) {
      console.error('Kelime silme hatası:', error);
      alert('Kelime silinirken bir hata oluştu');
    }
  }

  async function handleDeleteDeck() {
    if (!currentUser || !deckId) return;
    if (!confirm('Bu deck\'i silmek istediğinize emin misiniz? Tüm kelimeler de silinecektir.')) return;

    try {
      // Deck'i sil
      await deleteDoc(doc(db, `users/${currentUser.uid}/decks/${deckId}`));
      
      // Deck'e ait kelimeleri de sil
      const wordsRef = collection(db, `users/${currentUser.uid}/words`);
      const wordsQuery = query(wordsRef, where('deckId', '==', deckId));
      const wordsSnapshot = await getDocs(wordsQuery);
      
      const deletePromises = wordsSnapshot.docs.map((wordDoc) =>
        deleteDoc(doc(db, `users/${currentUser.uid}/words/${wordDoc.id}`))
      );
      await Promise.all(deletePromises);
      
      router.push('/dashboard');
    } catch (error) {
      console.error('Deck silme hatası:', error);
      alert('Deck silinirken bir hata oluştu');
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-20">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-6 h-6 text-gray-700" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{deck?.deckName || 'Yükleniyor...'}</h1>
              <p className="text-sm text-gray-600">{words.length} kelime</p>
            </div>
            <button
              onClick={handleDeleteDeck}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              title="Deck'i Sil"
            >
              <TrashIcon className="w-6 h-6 text-red-600" />
            </button>
          </div>

          {/* Quiz Button */}
          {words.length > 0 && (
            <button
              onClick={() => router.push(`/quiz/${deckId}`)}
              className="w-full mb-4 bg-green-500 text-white py-3 rounded-xl font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <PlayIcon className="w-5 h-5" />
              Quiz Yap
            </button>
          )}

          {/* Add Word Button */}
          <button
            onClick={() => setShowAddWord(!showAddWord)}
            className="w-full mb-4 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            Yeni Kelime Ekle
          </button>

          {/* Add Word Form */}
          {showAddWord && (
            <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
              <form onSubmit={handleAddWord} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Orijinal Kelime
                  </label>
                  <input
                    type="text"
                    name="original"
                    value={newWord.original}
                    onChange={(e) => setNewWord({ ...newWord, original: e.target.value })}
                    placeholder="Örn: Hello"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Çeviri
                  </label>
                  <input
                    type="text"
                    value={newWord.translation}
                    onChange={(e) => setNewWord({ ...newWord, translation: e.target.value })}
                    placeholder="Örn: Merhaba"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Örnek Cümle (Opsiyonel)
                  </label>
                  <textarea
                    value={newWord.exampleSentence}
                    onChange={(e) => setNewWord({ ...newWord, exampleSentence: e.target.value })}
                    placeholder="Örn: Hello, how are you?"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Ekle
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddWord(false);
                      setNewWord({
                        original: '',
                        translation: '',
                        exampleSentence: '',
                      });
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Words List */}
          {loading ? (
            <div className="text-center py-12 text-gray-600">Yükleniyor...</div>
          ) : words.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Henüz kelime eklemediniz.</p>
              <p className="text-sm text-gray-500">Yukarıdaki butona tıklayarak yeni kelime ekleyebilirsiniz.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {words.map((word) => (
                <div
                  key={word.wordId}
                  className="bg-white rounded-xl shadow-lg p-4 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{word.original}</h3>
                        <span className="text-gray-400">→</span>
                        <h3 className="text-xl font-semibold text-indigo-600">{word.translation}</h3>
                      </div>
                      {word.exampleSentence && (
                        <p className="text-sm text-gray-600 italic mt-2">
                          "{word.exampleSentence}"
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteWord(word.wordId)}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex-shrink-0"
                      title="Sil"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

