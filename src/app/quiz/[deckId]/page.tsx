'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { collection, query, where, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Word, Deck } from '@/types';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from 'framer-motion';

export default function Quiz() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  const deckId = params.deckId as string;
  const wrongOnly = searchParams.get('wrongOnly') === 'true';
  
  const [deck, setDeck] = useState<Deck | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState<{ wordId: string; known: boolean }[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [direction, setDirection] = useState(0);
  const [dragDirection, setDragDirection] = useState(0);

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
          isKnown: doc.data().isKnown,
        });
      });
      
      // Eğer wrongOnly true ise, sadece yanlış bilinen kelimeleri al
      let filteredWords = wordsData;
      if (wrongOnly) {
        filteredWords = wordsData.filter((word) => word.isKnown === false);
      }
      
      // Kelimeleri karıştır
      const shuffled = filteredWords.sort(() => Math.random() - 0.5);
      setWords(shuffled);
    } catch (error) {
      console.error('Kelime yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleKnown() {
    if (currentIndex >= words.length) return;
    
    const currentWord = words[currentIndex];
    setResults([...results, { wordId: currentWord.wordId, known: true }]);
    
    // Firebase'e kelimeyi "bilindi" olarak kaydet
    if (currentUser) {
      try {
        await updateDoc(doc(db, `users/${currentUser.uid}/words/${currentWord.wordId}`), {
          isKnown: true,
        });
      } catch (error) {
        console.error('Kelime durumu güncellenirken hata:', error);
      }
    }
    
    nextCard();
  }

  async function handleUnknown() {
    if (currentIndex >= words.length) return;
    
    const currentWord = words[currentIndex];
    setResults([...results, { wordId: currentWord.wordId, known: false }]);
    
    // Firebase'e kelimeyi "bilinmedi" olarak kaydet
    if (currentUser) {
      try {
        await updateDoc(doc(db, `users/${currentUser.uid}/words/${currentWord.wordId}`), {
          isKnown: false,
        });
      } catch (error) {
        console.error('Kelime durumu güncellenirken hata:', error);
      }
    }
    
    nextCard();
  }

  function nextCard() {
    setShowAnswer(false);
    setDragDirection(0);
    if (currentIndex + 1 >= words.length) {
      setIsFinished(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  }

  const swipeHandlers = useSwipeable({
    onSwipedRight: () => {
      if (!showAnswer) return;
      setDirection(1);
      handleKnown();
    },
    onSwipedLeft: () => {
      if (!showAnswer) return;
      setDirection(-1);
      handleUnknown();
    },
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  function handleDragEnd(event: any, info: any) {
    if (!showAnswer) return;
    
    // Ekran genişliğinin %30'u threshold olarak kullan
    const threshold = window.innerWidth * 0.6;
    if (info.offset.x > threshold) {
      setDirection(1);
      handleKnown();
    } else if (info.offset.x < -threshold) {
      setDirection(-1);
      handleUnknown();
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-main)' }}>
          <div style={{ color: 'var(--text-muted)' }}>Yükleniyor...</div>
        </div>
      </ProtectedRoute>
    );
  }

  if (words.length === 0) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-main)' }}>
          <div className="text-center">
            {wrongOnly ? (
              <>
                <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                  🎉 Tebrikler! Yanlış bildiğiniz kelime kalmadı.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => router.push(`/quiz/${deckId}`)}
                    className="px-6 py-3 rounded-lg transition-all"
                    style={{
                      backgroundColor: 'var(--btn-primary-bg)',
                      color: 'var(--btn-primary-text)'
                    }}
                  >
                    Tüm Kelimelerden Quiz Yap
                  </button>
                  <button
                    onClick={() => router.push(`/deck/${deckId}`)}
                    className="px-6 py-3 rounded-lg transition-all"
                    style={{
                      backgroundColor: 'var(--btn-secondary-bg)',
                      color: 'var(--btn-secondary-text)'
                    }}
                  >
                    Deck'e Dön
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Bu deck'te henüz kelime yok.
                </p>
                <button
                  onClick={() => router.push(`/deck/${deckId}`)}
                  className="px-6 py-3 rounded-lg transition-all"
                  style={{
                    backgroundColor: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)'
                  }}
                >
                  Kelime Ekle
                </button>
              </>
            )}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (isFinished) {
    const knownCount = results.filter((r) => r.known).length;
    const unknownCount = results.filter((r) => !r.known).length;
    const total = results.length;
    const percentage = Math.round((knownCount / total) * 100);

    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center px-4 py-6" style={{ backgroundColor: 'var(--bg-main)' }}>
          <div className="max-w-md w-full rounded-2xl p-8" style={{ 
            backgroundColor: 'var(--bg-card)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 className="text-3xl font-bold text-center mb-6" style={{ color: 'var(--text-primary)' }}>
              Quiz Tamamlandı!
            </h2>
            
            <div className="space-y-4 mb-8">
              <div className="text-center">
                <div className="text-5xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {percentage}%
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>Doğru Cevap</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#F0FDF4' }}>
                  <div className="text-3xl font-bold" style={{ color: '#16A34A' }}>{knownCount}</div>
                  <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Bildiğiniz</div>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#FEF2F2' }}>
                  <div className="text-3xl font-bold" style={{ color: '#DC2626' }}>{unknownCount}</div>
                  <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Bilmediğiniz</div>
                </div>
              </div>
              
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--btn-secondary-bg)' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{total}</div>
                <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Toplam Kelime</div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  // State'i sıfırla ve quiz'i yeniden başlat
                  setCurrentIndex(0);
                  setShowAnswer(false);
                  setResults([]);
                  setIsFinished(false);
                  setDirection(0);
                  setDragDirection(0);
                  // Kelimeleri tekrar karıştır
                  setWords([...words].sort(() => Math.random() - 0.5));
                }}
                className="w-full py-3 rounded-xl font-medium transition-all"
                style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)'
                }}
              >
                Tekrar Dene
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 rounded-xl font-medium transition-all"
                style={{
                  backgroundColor: 'var(--btn-secondary-bg)',
                  color: 'var(--btn-secondary-text)'
                }}
              >
                Ana Sayfaya Dön
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  return (
    <ProtectedRoute>
      <div className="min-h-screen pb-20" style={{ backgroundColor: 'var(--bg-main)' }}>
        <div className="max-w-md mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push(`/deck/${deckId}`)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {deck?.deckName}
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {currentIndex + 1} / {words.length}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-light)' }}>
              <div
                className="h-full transition-all duration-300"
                style={{ 
                  width: `${progress}%`,
                  backgroundColor: 'var(--btn-primary-bg)'
                }}
              />
            </div>
          </div>

          {/* Card */}
          <div className="flex items-center justify-center min-h-[60vh] relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: direction * 400, rotate: direction * 20 }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                exit={{ opacity: 0, x: direction * -400, rotate: direction * -20 }}
                transition={{ 
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                }}
                drag={showAnswer ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                onDrag={(event, info) => {
                  setDragDirection(info.offset.x);
                }}
                {...swipeHandlers}
                className="w-full cursor-grab active:cursor-grabbing"
                style={{
                  touchAction: 'none'
                }}
              >
                <motion.div 
                  className="rounded-2xl p-6 min-h-[320px] flex flex-col justify-center items-center relative overflow-hidden"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  animate={{
                    rotate: dragDirection * 0.05
                  }}
                >
                  {/* Drag Indicators */}
                  {showAnswer && (
                    <>
                      <motion.div
                        className="absolute top-4 right-4 text-5xl font-bold text-green-500 pointer-events-none"
                        animate={{
                          opacity: dragDirection > 50 ? 1 : 0,
                          scale: dragDirection > 50 ? 1.2 : 0.5
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        ✓
                      </motion.div>
                      <motion.div
                        className="absolute top-4 left-4 text-5xl font-bold text-red-500 pointer-events-none"
                        animate={{
                          opacity: dragDirection < -50 ? 1 : 0,
                          scale: dragDirection < -50 ? 1.2 : 0.5
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        ✗
                      </motion.div>
                    </>
                  )}
                  <div className="text-center mb-4">
                    <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                      {currentWord.original}
                    </h2>
                    {!showAnswer && (
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Cevabı görmek için butona basın
                      </p>
                    )}
                  </div>

                  {showAnswer && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="w-full space-y-4"
                    >
                      <div className="text-center">
                        <h3 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                          {currentWord.translation}
                        </h3>
                        {currentWord.exampleSentence && (
                          <p className="italic mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                            "{currentWord.exampleSentence}"
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {!showAnswer && (
                    <button
                      onClick={() => setShowAnswer(true)}
                      className="mt-6 w-full py-3 rounded-xl font-medium transition-all"
                      style={{
                        backgroundColor: 'var(--btn-primary-bg)',
                        color: 'var(--btn-primary-text)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                      }}
                    >
                      Göster
                    </button>
                  )}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          {showAnswer && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 grid grid-cols-2 gap-4"
            >
              <button
                onClick={handleUnknown}
                className="py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
              >
                <span className="text-2xl">←</span>
                Bilmedim
              </button>
              <button
                onClick={handleKnown}
                className="py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
              >
                Bildim
                <span className="text-2xl">→</span>
              </button>
            </motion.div>
          )}

          {/* Swipe Hint */}
          {showAnswer && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center text-sm mt-4"
              style={{ color: 'var(--text-muted)' }}
            >
              💡 Kartı sürükleyin veya kaydırın
            </motion.p>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

