
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  getAuth,
  updatePassword
} from 'firebase/auth';
import { initializeApp, getApp, deleteApp } from 'firebase/app';
import { auth, firebaseConfig } from '../lib/firebase';
import { db } from '../lib/db';
import { User as UserProfile } from '../lib/types';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  mustChangePassword: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, role?: 'ops_manager' | 'officer') => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  createClientUser: (email: string, pass: string, name: string, clientId: string) => Promise<void>;
  changePassword: (newPass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children?: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // If we are in demo mode, ignore firebase updates (which might be null)
      if (isDemo) {
        setLoading(false);
        return;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch Profile from Firestore
        const { data } = await db.users.get(firebaseUser.uid);
        if (data) {
           setProfile(data);
           if (data.is_temporary_password) {
               setMustChangePassword(true);
           } else {
               setMustChangePassword(false);
           }
        } else {
           // Fallback / First time creation
           // If email contains 'admin', default to ops_manager for convenience
           const defaultRole = firebaseUser.email?.toLowerCase().includes('admin') ? 'ops_manager' : 'officer';
           
           const newProfile: UserProfile = {
              id: firebaseUser.uid,
              full_name: firebaseUser.displayName || 'New User',
              email: firebaseUser.email!,
              role: defaultRole,
              avatar_url: firebaseUser.photoURL || undefined
           };
           // Note: We don't strictly require writing to DB for this to work in memory,
           // but good for persistence.
           setProfile(newProfile);
           setMustChangePassword(false);
        }
      } else {
        setUser(null);
        setProfile(null);
        setMustChangePassword(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [isDemo]);

  const login = async (email: string, pass: string) => {
    // Special handling for the demo credentials displayed in the UI
    const demoEmails = ['admin@guardian.com', 'officer@guardian.com', 'client@guardian.com'];
    
    if (demoEmails.includes(email) && pass === 'password123') {
      try {
        await signInWithEmailAndPassword(auth, email, pass);
        setIsDemo(false);
      } catch (e) {
        // If Firebase fails (e.g. project not configured, user doesn't exist), fallback to Demo Mode
        console.warn("Firebase login failed, falling back to Demo Mode.");
        setIsDemo(true);
        
        let uid = 'demo_admin_user';
        let role = 'ops_manager';
        let name = 'Demo Admin';

        if (email === 'officer@guardian.com') {
            uid = 'demo_officer_user';
            role = 'officer';
            name = 'John Spartan';
        } else if (email === 'client@guardian.com') {
            uid = 'demo_client_user';
            role = 'client';
            name = 'Sarah Connor';
        }
        
        // Mock Firebase User
        setUser({
          uid: uid,
          email: email,
          displayName: name,
          emailVerified: true,
          isAnonymous: false,
          metadata: {},
          providerData: [],
          refreshToken: '',
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => 'demo-token',
          getIdTokenResult: async () => ({} as any),
          reload: async () => {},
          toJSON: () => ({}),
          phoneNumber: null,
          photoURL: null
        });

        // Try to fetch profile from DB first to get relationships (like client_id from seed)
        const { data: existingProfile } = await db.users.get(uid);

        if (existingProfile) {
             setProfile(existingProfile);
             if (existingProfile.is_temporary_password) setMustChangePassword(true);
        } else {
            // Mock Profile Fallback
            setProfile({
                id: uid,
                full_name: name,
                email: email,
                role: role as any,
                avatar_url: undefined,
                // Placeholder if not seeded yet
                client_id: role === 'client' ? 'demo_client_placeholder' : undefined 
            });
        }
      }
      return;
    }

    // Standard Login
    await signInWithEmailAndPassword(auth, email, pass);
    setIsDemo(false);
  };

  const signup = async (email: string, pass: string, role: 'ops_manager' | 'officer' = 'officer') => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    // Create initial profile in DB
    const newProfile: UserProfile = {
        id: res.user.uid,
        full_name: 'New User',
        email: email,
        role: role, 
    };
    await db.users.create(newProfile);
    setProfile(newProfile);
    setIsDemo(false);
  };

  const createClientUser = async (email: string, pass: string, name: string, clientId: string) => {
      // Create a secondary app to create user without logging out current admin
      let secondaryApp;
      try {
          // Check if app exists
          try {
              secondaryApp = getApp('SecondaryApp');
          } catch {
              secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
          }
          
          const secondaryAuth = getAuth(secondaryApp);
          const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
          const newUser = userCred.user;
          
          // Create Firestore Profile
          const newProfile: UserProfile = {
              id: newUser.uid,
              full_name: name,
              email: email,
              role: 'client',
              client_id: clientId,
              is_temporary_password: true
          };
          
          await db.users.create(newProfile);
          
          // Sign out from secondary app to be clean
          await signOut(secondaryAuth);
          
          // We can delete the app if we want to clean up resources, but in React strict mode 
          // it might cause re-init issues if called rapidly. 
          // deleteApp(secondaryApp); 
          
      } catch (error) {
          console.error("Error creating client user:", error);
          throw error;
      }
  };

  const changePassword = async (newPass: string) => {
      if (isDemo) {
          setMustChangePassword(false);
          // Update mock DB if possible
          if (profile) {
              const updated = { ...profile, is_temporary_password: false };
              setProfile(updated);
              await db.users.update(profile.id, { is_temporary_password: false });
          }
          return;
      }

      if (auth.currentUser) {
          await updatePassword(auth.currentUser, newPass);
          // Update profile in DB
          if (profile) {
              await db.users.update(profile.id, { is_temporary_password: false });
              setProfile({ ...profile, is_temporary_password: false });
          }
          setMustChangePassword(false);
      }
  };

  const logout = async () => {
    if (isDemo) {
      setIsDemo(false);
      setUser(null);
      setProfile(null);
      setMustChangePassword(false);
    } else {
      await signOut(auth);
    }
  };
  
  const refreshProfile = async () => {
    if (user) {
        const { data } = await db.users.get(user.uid);
        if (data) {
           setProfile(data);
           setMustChangePassword(!!data.is_temporary_password);
        }
    }
  };

  const value = {
    user,
    profile,
    loading,
    mustChangePassword,
    login,
    signup,
    logout,
    refreshProfile,
    createClientUser,
    changePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
