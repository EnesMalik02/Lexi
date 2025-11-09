'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        provider: 'password',
      });
    } catch (error: any) {
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
      } else if (error.code === 'auth/invalid-credential') {
        throw new Error('Email veya şifre hatalı.');
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
    resetPassword,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}