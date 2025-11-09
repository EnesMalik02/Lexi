'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function signup(email: string, password: string) {
    try {
      // Önce email adresinin başka bir yöntemle kayıtlı olup olmadığını kontrol et
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      
      if (signInMethods.length > 0) {
        // Email zaten kayıtlı
        if (signInMethods.includes('google.com')) {
          throw new Error(
            'Bu email adresi Google ile zaten kayıtlı. ' +
            'Lütfen Google ile giriş yapın.'
          );
        } else if (signInMethods.includes('password')) {
          throw new Error('Bu email adresi zaten kullanımda.');
        }
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Kullanıcı bilgilerini Firestore'a kaydet
      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        provider: 'password',
      });
    } catch (error: any) {
      // Firebase hatalarını Türkçe'ye çevir
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Bu email adresi zaten kullanımda.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Şifre çok zayıf. En az 6 karakter olmalıdır.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Geçersiz email adresi.');
      }
      throw error;
    }
  }

  async function login(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Last login bilgisini güncelle
      await setDoc(
        doc(db, 'users', user.uid),
        {
          email: email,
          lastLogin: serverTimestamp(),
          provider: 'password',
        },
        { merge: true }
      );
    } catch (error: any) {
      // Firebase hatalarını Türkçe'ye çevir
      if (error.code === 'auth/user-not-found') {
        throw new Error('Bu email adresi ile kayıtlı kullanıcı bulunamadı.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Hatalı şifre.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Geçersiz email adresi.');
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('Bu hesap devre dışı bırakılmış.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.');
      }
      throw error;
    }
  }

  async function signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      // Türkçe dil desteği için
      provider.setCustomParameters({
        prompt: 'select_account',
        display: 'popup'
      });
      
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      if (!user.email) {
        await signOut(auth);
        throw new Error('Google hesabından email bilgisi alınamadı.');
      }
      
      // Firestore'da bu email ile kayıtlı başka bir kullanıcı var mı kontrol et
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', user.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Bu email ile kayıtlı kullanıcı(lar) var
        const existingUserDoc = querySnapshot.docs[0];
        const existingUserData = existingUserDoc.data();
        const existingUserId = existingUserDoc.id;
        
        // Eğer mevcut kullanıcı farklı bir UID'ye sahipse (farklı provider ile kayıt olmuş)
        if (existingUserId !== user.uid) {
          // Provider kontrolü
          if (existingUserData.provider === 'password') {
            // Kullanıcıyı çıkar ve hata ver
            await signOut(auth);
            throw new Error(
              'Bu email adresi daha önce email/şifre ile kayıt edilmiş. ' +
              'Lütfen email ve şifreniz ile giriş yapın.'
            );
          }
        }
      }
      
      // Kullanıcı bilgilerini Firestore'a kaydet veya güncelle
      await setDoc(
        doc(db, 'users', user.uid),
        {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          lastLogin: serverTimestamp(),
          provider: 'google',
        },
        { merge: true }
      );
    } catch (error: any) {
      // Firebase hatalarını Türkçe'ye çevir
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Giriş penceresi kapatıldı.');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup engellendi. Lütfen tarayıcınızın popup ayarlarını kontrol edin.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        throw new Error('Giriş işlemi iptal edildi.');
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        throw new Error('Bu email adresi farklı bir giriş yöntemi ile zaten kayıtlı.');
      }
      throw error;
    }
  }

  async function resetPassword(email: string) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        throw new Error('Bu email adresi ile kayıtlı kullanıcı bulunamadı.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Geçersiz email adresi.');
      }
      throw error;
    }
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    login,
    signup,
    signInWithGoogle,
    resetPassword,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

