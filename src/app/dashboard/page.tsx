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
      <div className="min-h-screen pb-20" style={{ backgroundColor: 'var(--bg-main)' }}>
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Lexi
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Kelime Tekrar Uygulaması
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm rounded-lg transition-all"
              style={{ 
                backgroundColor: 'var(--btn-secondary-bg)',
                color: 'var(--btn-secondary-text)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              Çıkış
            </button>
          </div>

          {/* Add Deck Button */}
          <button
            onClick={() => setShowAddDeck(!showAddDeck)}
            className="w-full mb-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            style={{ 
              backgroundColor: showAddDeck ? 'var(--btn-secondary-bg)' : 'var(--btn-primary-bg)', 
              color: showAddDeck ? 'var(--btn-secondary-text)' : 'var(--btn-primary-text)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <PlusIcon className="w-5 h-5" />
            Yeni Deck Ekle
          </button>

          {/* Add Deck Form */}
          {showAddDeck && (
            <div className="rounded-xl p-6 mb-6" style={{ 
              backgroundColor: 'var(--bg-card)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <form onSubmit={handleAddDeck} className="space-y-4">
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Deck adı girin..."
                  className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                  style={{ 
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-primary)'
                  }}
                  required
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddDeck(false);
                      setNewDeckName('');
                    }}
                    className="flex-1 py-3 rounded-lg font-medium transition-all"
                    style={{ 
                      backgroundColor: 'var(--btn-secondary-bg)', 
                      color: 'var(--btn-secondary-text)'
                    }}
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-lg font-medium transition-all"
                    style={{ 
                      backgroundColor: 'var(--btn-primary-bg)', 
                      color: 'var(--btn-primary-text)'
                    }}
                  >
                    Ekle
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Decks List */}
          {loading ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
              Yükleniyor...
            </div>
          ) : decks.length === 0 ? (
            <div className="text-center py-12">
              <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                Henüz deck oluşturmadınız.
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Yukarıdaki butona tıklayarak yeni bir deck oluşturabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {decks.map((deck) => (
                <div
                  key={deck.deckId}
                  onClick={() => router.push(`/deck/${deck.deckId}`)}
                  className="rounded-xl p-5 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                  style={{ 
                    backgroundColor: 'var(--bg-card)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {deck.deckName}
                  </h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Kelimeleri görüntülemek için tıklayın →
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

