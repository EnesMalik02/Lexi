'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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
      // Önce bu email'in başka bir metodla kayıtlı olup olmadığını kontrol et
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      
      // Eğer Google ile kayıtlıysa
      if (signInMethods.includes('google.com')) {
        throw new Error('Bu email adresi Google hesabı ile kayıtlı. Lütfen "Google ile Devam Et" butonunu kullanın.');
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Kullanıcı bilgilerini Firestore'a kaydet
      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
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
      
      // Last login bilgisini güncelle ve email'i de güncel tut
      await setDoc(
        doc(db, 'users', user.uid),
        {
          email: email,
          lastLogin: serverTimestamp(),
        },
        { merge: true } // Mevcut verileri koru, sadece belirtilen alanları güncelle
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

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      if (!user.email) {
        await signOut(auth);
        throw new Error('Google hesabınızdan email alınamadı');
      }
      
      // Kullanıcının email'i için mevcut giriş metodlarını kontrol et
      const signInMethods = await fetchSignInMethodsForEmail(auth, user.email);
      
      // Eğer 'password' methodu varsa ve kullanıcı Google ile giriş yapmaya çalışıyorsa
      if (signInMethods.includes('password') && !signInMethods.includes('google.com')) {
        // Kullanıcıyı logout et
        await signOut(auth);
        throw new Error('Bu email adresi zaten kayıtlı. Lütfen email ve şifreniz ile giriş yapın.');
      }
      
      // Kullanıcı bilgilerini Firestore'a kaydet veya güncelle
      await setDoc(
        doc(db, 'users', user.uid),
        {
          email: user.email,
          username: user.displayName,
          photoURL: user.photoURL,
          lastLogin: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error: any) {
      // Firebase hatalarını Türkçe'ye çevir
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Giriş penceresi kapatıldı');
      } else if (error.code === 'auth/cancelled-popup-request') {
        throw new Error('Giriş işlemi iptal edildi');
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
    loginWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

