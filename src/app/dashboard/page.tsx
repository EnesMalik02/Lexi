'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Deck } from '@/types';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDeck, setShowAddDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');

  useEffect(() => {
    if (currentUser) {
      loadDecks();
    }
  }, [currentUser]);

  async function loadDecks() {
    if (!currentUser) return;
    
    try {
      const decksRef = collection(db, `users/${currentUser.uid}/decks`);
      const querySnapshot = await getDocs(decksRef);
      const decksData: Deck[] = [];
      
      querySnapshot.forEach((doc) => {
        decksData.push({
          deckId: doc.id,
          deckName: doc.data().deckName,
        });
      });
      
      setDecks(decksData);
    } catch (error) {
      console.error('Deck yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddDeck(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !newDeckName.trim()) return;

    try {
      const decksRef = collection(db, `users/${currentUser.uid}/decks`);
      await addDoc(decksRef, {
        deckName: newDeckName.trim(),
      });
      
      setNewDeckName('');
      setShowAddDeck(false);
      loadDecks();
    } catch (error) {
      console.error('Deck ekleme hatası:', error);
      alert('Deck eklenirken bir hata oluştu');
    }
  }

  async function handleDeleteDeck(deckId: string) {
    if (!currentUser) return;
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
      
      loadDecks();
    } catch (error) {
      console.error('Deck silme hatası:', error);
      alert('Deck silinirken bir hata oluştu');
    }
  }

  function handleLogout() {
    logout();
    router.push('/');
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-20">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Lexi</h1>
              <p className="text-gray-600 text-sm mt-1">Kelime Tekrar Uygulaması</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-700 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
            >
              Çıkış
            </button>
          </div>

          {/* Add Deck Button */}
          <button
            onClick={() => setShowAddDeck(!showAddDeck)}
            className="w-full mb-4 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            Yeni Deck Ekle
          </button>

          {/* Add Deck Form */}
          {showAddDeck && (
            <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
              <form onSubmit={handleAddDeck} className="space-y-3">
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Deck adı girin..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                  autoFocus
                />
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
                      setShowAddDeck(false);
                      setNewDeckName('');
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Decks List */}
          {loading ? (
            <div className="text-center py-12 text-gray-600">Yükleniyor...</div>
          ) : decks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Henüz deck oluşturmadınız.</p>
              <p className="text-sm text-gray-500">Yukarıdaki butona tıklayarak yeni bir deck oluşturabilirsiniz.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {decks.map((deck) => (
                <div
                  key={deck.deckId}
                  onClick={() => router.push(`/deck/${deck.deckId}`)}
                  className="bg-white rounded-xl shadow-lg p-5 hover:shadow-xl transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <h3 className="text-xl font-semibold text-gray-900">{deck.deckName}</h3>
                  <p className="text-sm text-gray-500 mt-1">Kelimeleri görüntülemek için tıklayın →</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

