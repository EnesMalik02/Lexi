'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Word, Deck } from '@/types';
import { ArrowLeftIcon, PlusIcon, TrashIcon, PlayIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';


function Modal({
  open,
  title,
  description,
  confirmText = 'Evet',
  cancelText = 'Vazgeç',
  onConfirm,
  onCancel,
  confirmLoading = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmLoading?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Arkaplan */}
<div className="absolute inset-0 bg-black/60 backdrop-blur-[5px]" onClick={onCancel} />


   <div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  className="relative w-full sm:w-[32rem] mx-0 sm:mx-4 rounded-2xl shadow-2xl border bg-[var(--bg-card)] text-[var(--text-primary)]"
  style={{ borderColor: 'var(--border-gary)' }}
>

        <div className="p-6">
          <div className="flex items-start gap-3">
            <div
              className="mt-1 h-10 w-10 shrink-0 rounded-full grid place-items-center"
              style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--btn-secondary-text)' }}
            >
              <TrashIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 id="modal-title" className="text-lg font-semibold">
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center px-4 h-10 rounded-xl border transition"
              style={{
                borderColor: 'var(--border-light)',
                backgroundColor: 'var(--btn-secondary-bg)',
                color: 'var(--btn-secondary-text)',
              }}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmLoading}
              className="inline-flex items-center justify-center px-4 h-10 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
            >
              {confirmLoading ? 'Siliniyor…' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DeckDetail() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  const deckId = params.deckId as string;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddWord, setShowAddWord] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [newWord, setNewWord] = useState({
    original: '',
    translation: '',
    exampleSentence: '',
  });
  const [editWord, setEditWord] = useState({
    original: '',
    translation: '',
    exampleSentence: '',
  });

  // MODAL durumları
  const [openDeleteDeck, setOpenDeleteDeck] = useState(false);
  const [openDeleteWord, setOpenDeleteWord] = useState(false);
  const [pendingWordId, setPendingWordId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const lastDeleteBtnRef = useRef<HTMLElement | null>(null); // opsiyonel odak iadesi

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

      querySnapshot.forEach((docSnap) => {
        wordsData.push({
          wordId: docSnap.id,
          deckId: docSnap.data().deckId,
          original: docSnap.data().original,
          translation: docSnap.data().translation,
          exampleSentence: docSnap.data().exampleSentence,
          isKnown: docSnap.data().isKnown,
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

      // inputları temizle (modal yoksa da temizler)
      setNewWord({ original: '', translation: '', exampleSentence: '' });
      loadWords();

      // ilk input'a focus
      setTimeout(() => {
        const firstInput = document.querySelector<HTMLInputElement>('input[name="original"]');
        firstInput?.focus();
      }, 0);
    } catch (error) {
      console.error('Kelime ekleme hatası:', error);
      alert('Kelime eklenirken bir hata oluştu');
    }
  }

  // === KELİME SİLME: modal açan tetikleyici ===
  function askDeleteWord(wordId: string, e: React.MouseEvent) {
    e.stopPropagation(); // kart tıklamasını engelle
    setPendingWordId(wordId);
    lastDeleteBtnRef.current = e.currentTarget as HTMLElement; // opsiyonel
    setOpenDeleteWord(true);
  }

  // === KELİME SİLME: onaylanmış aksiyon ===
  async function handleDeleteWordConfirmed() {
    if (!currentUser || !pendingWordId) return;
    try {
      setDeleting(true);
      await deleteDoc(doc(db, `users/${currentUser.uid}/words/${pendingWordId}`));
      setOpenDeleteWord(false);
      setPendingWordId(null);
      loadWords();
      lastDeleteBtnRef.current?.focus?.();
    } catch (error) {
      console.error('Kelime silme hatası:', error);
      alert('Kelime silinirken bir hata oluştu');
    } finally {
      setDeleting(false);
    }
  }

  function handleEditWord(word: Word) {
    setEditingWord(word);
    setEditWord({
      original: word.original,
      translation: word.translation,
      exampleSentence: word.exampleSentence || '',
    });
    setShowAddWord(false);
  }

  async function handleUpdateWord(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !editingWord || !editWord.original.trim() || !editWord.translation.trim()) return;

    try {
      await updateDoc(doc(db, `users/${currentUser.uid}/words/${editingWord.wordId}`), {
        original: editWord.original.trim(),
        translation: editWord.translation.trim(),
        exampleSentence: editWord.exampleSentence.trim() || null,
      });

      setEditingWord(null);
      setEditWord({ original: '', translation: '', exampleSentence: '' });
      loadWords();
    } catch (error) {
      console.error('Kelime güncelleme hatası:', error);
      alert('Kelime güncellenirken bir hata oluştu');
    }
  }

  function cancelEdit() {
    setEditingWord(null);
    setEditWord({ original: '', translation: '', exampleSentence: '' });
  }

  // === DECK SİLME: modalı aç ===
  function askDeleteDeck() {
    setOpenDeleteDeck(true);
  }

  // === DECK SİLME: onaylanmış aksiyon ===
  async function handleDeleteDeckConfirmed() {
    if (!currentUser || !deckId) return;

    try {
      setDeleting(true);

      // Deck'i sil
      await deleteDoc(doc(db, `users/${currentUser.uid}/decks/${deckId}`));

      // Deck'e ait kelimeleri sil
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
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen pb-20" style={{ backgroundColor: 'var(--bg-main)' }}>
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {deck?.deckName || 'Yükleniyor...'}
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {words.length} kelime
              </p>
            </div>
            <button
              onClick={askDeleteDeck}
              className="p-2 rounded-lg transition-colors"
              title="Deck'i Sil"
              style={{ color: 'var(--icon-gray)' }}
            >
              <TrashIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Quiz Buttons */}
          {words.length > 0 && (
            <div className="space-y-3 mb-4">
              <button
                onClick={() => router.push(`/quiz/${deckId}`)}
                className="w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <PlayIcon className="w-5 h-5" />
                Tüm Kelimelerden Quiz Yap
              </button>

              {words.filter((w) => w.isKnown === false).length > 0 && (
                <button
                  onClick={() => router.push(`/quiz/${deckId}?wrongOnly=true`)}
                  className="w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                >
                  <PlayIcon className="w-5 h-5" />
                  Yanlış Bildiklerimden Quiz Yap ({words.filter((w) => w.isKnown === false).length})
                </button>
              )}
            </div>
          )}

          {/* Add Word Button */}
          <button
            onClick={() => {
              setShowAddWord(!showAddWord);
              setEditingWord(null);
            }}
            className="w-full mb-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor: showAddWord ? 'var(--btn-secondary-bg)' : 'var(--btn-primary-bg)',
              color: showAddWord ? 'var(--btn-secondary-text)' : 'var(--btn-primary-text)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <PlusIcon className="w-5 h-5" />
            Yeni Kelime Ekle
          </button>

          {/* Add Word Form */}
          {showAddWord && (
            <div
              className="rounded-xl p-6 mb-6"
              style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            >
              <form onSubmit={handleAddWord} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Orijinal Kelime
                  </label>
                  <input
                    type="text"
                    name="original"
                    value={newWord.original}
                    onChange={(e) => setNewWord({ ...newWord, original: e.target.value })}
                    placeholder="Örn: Serendipity"
                    className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-light)',
                      color: 'var(--text-primary)',
                    }}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Çeviri
                  </label>
                  <input
                    type="text"
                    value={newWord.translation}
                    onChange={(e) => setNewWord({ ...newWord, translation: e.target.value })}
                    placeholder="Örn: Hoş tesadüf"
                    className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-light)',
                      color: 'var(--text-primary)',
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Örnek Cümle (İsteğe Bağlı)
                  </label>
                  <textarea
                    value={newWord.exampleSentence}
                    onChange={(e) => setNewWord({ ...newWord, exampleSentence: e.target.value })}
                    placeholder="Örn: We found the café by pure serendipity."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg outline-none resize-none transition-all"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-light)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddWord(false);
                      setNewWord({ original: '', translation: '', exampleSentence: '' });
                    }}
                    className="flex-1 py-3 rounded-lg font-medium transition-all"
                    style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--btn-secondary-text)' }}
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-lg font-medium transition-all"
                    style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
                  >
                    Ekle
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Word Form */}
          {editingWord && (
            <div
              className="rounded-xl p-6 mb-6"
              style={{
                backgroundColor: 'var(--bg-card)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                border: '2px solid var(--btn-primary-bg)',
              }}
            >
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Kelimeyi Düzenle
              </h3>
              <form onSubmit={handleUpdateWord} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Orijinal Kelime
                  </label>
                  <input
                    type="text"
                    value={editWord.original}
                    onChange={(e) => setEditWord({ ...editWord, original: e.target.value })}
                    placeholder="Örn: Serendipity"
                    className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-light)',
                      color: 'var(--text-primary)',
                    }}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Çeviri
                  </label>
                  <input
                    type="text"
                    value={editWord.translation}
                    onChange={(e) => setEditWord({ ...editWord, translation: e.target.value })}
                    placeholder="Örn: Hoş tesadüf"
                    className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-light)',
                      color: 'var(--text-primary)',
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Örnek Cümle (İsteğe Bağlı)
                  </label>
                  <textarea
                    value={editWord.exampleSentence}
                    onChange={(e) => setEditWord({ ...editWord, exampleSentence: e.target.value })}
                    placeholder="Örn: We found the café by pure serendipity."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg outline-none resize-none transition-all"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-light)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 py-3 rounded-lg font-medium transition-all"
                    style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--btn-secondary-text)' }}
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-lg font-medium transition-all"
                    style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
                  >
                    Güncelle
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Words List */}
          {loading ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
              Yükleniyor...
            </div>
          ) : words.length === 0 ? (
            <div className="text-center py-12">
              <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                Henüz kelime eklemediniz.
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Yukarıdaki butona tıklayarak yeni kelime ekleyebilirsiniz.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                Mevcut Kelimeler
              </h2>
              <div className="space-y-3">
                {words.map((word) => (
                  <div
                    key={word.wordId}
                    onClick={() => handleEditWord(word)}
                    className="rounded-xl p-5 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      boxShadow:
                        editingWord?.wordId === word.wordId ? '0 2px 8px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                      border: editingWord?.wordId === word.wordId ? '2px solid var(--btn-primary-bg)' : 'none',
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2">
                          <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                            {word.original}
                          </h3>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {word.translation}
                          </p>
                        </div>
                        {word.exampleSentence && (
                          <p className="text-sm italic mt-2" style={{ color: 'var(--text-muted)' }}>
                            "{word.exampleSentence}"
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => askDeleteWord(word.wordId, e)}
                        className="p-2 rounded-lg transition-colors flex-shrink-0"
                        style={{ color: 'var(--icon-gray)' }}
                        title="Sil"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* --- MODALLAR (sayfanın en sonunda) --- */}
        <Modal
          open={openDeleteDeck}
          onCancel={() => setOpenDeleteDeck(false)}
          onConfirm={handleDeleteDeckConfirmed}
          confirmLoading={deleting}
          title="Bu deck'i silmek istediğinize emin misiniz?"
          description="Tüm kelimeler de kalıcı olarak silinecektir. Bu işlem geri alınamaz."
          confirmText="Evet, sil"
          cancelText="Vazgeç"
        />

        <Modal
          open={openDeleteWord}
          onCancel={() => {
            setOpenDeleteWord(false);
            setPendingWordId(null);
          }}
          onConfirm={handleDeleteWordConfirmed}
          confirmLoading={deleting}
          title="Bu kelimeyi silmek istediğinize emin misiniz?"
          description="Bu işlem geri alınamaz."
          confirmText="Evet, sil"
          cancelText="Vazgeç"
        />
      </div>
    </ProtectedRoute>
  );
}
