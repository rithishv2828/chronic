import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, Diagnosis } from '../types';
import { Heart, Activity, Pill, Utensils, LayoutDashboard, FileText, Settings, LogOut, Menu, X, MessageSquare, MapPin, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          setIsProfileModalOpen(true);
        }
      }
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vitals', label: 'Vitals', icon: Heart },
    { id: 'meds', label: 'Medications', icon: Pill },
    { id: 'meals', label: 'Meals', icon: Utensils },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'chat', label: 'AI Assistant', icon: MessageSquare },
    { id: 'hospitals', label: 'Nearby Hospitals', icon: MapPin },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'report', label: 'Report', icon: FileText },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Heart className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Vitality</h1>
          <p className="text-slate-500 mb-8">Your personal health companion for chronic disease management.</p>
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {isSidebarOpen ? <X /> : <Menu />}
      </button>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transition-transform lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <Heart className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-slate-900">Vitality</span>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                  activeTab === item.id 
                    ? "bg-blue-50 text-blue-600 font-semibold" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3 px-4 py-3 mb-4">
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                alt="Profile"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.displayName}</p>
                <p className="text-xs text-slate-500 truncate">{profile?.diagnosis || 'Setting up...'}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Profile Setup Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Complete Your Profile</h2>
              <ProfileSetupForm 
                user={user} 
                onComplete={(p) => {
                  setProfile(p);
                  setIsProfileModalOpen(false);
                }} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileSetupForm({ user, onComplete }: { user: User, onComplete: (p: UserProfile) => void }) {
  const [diagnosis, setDiagnosis] = useState<Diagnosis>('Type 2 Diabetes');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const profile: UserProfile = {
      uid: user.uid,
      displayName: user.displayName || 'User',
      diagnosis,
      age: parseInt(age) || undefined,
      weight: parseFloat(weight) || undefined,
      createdAt: new Date().toISOString(),
      targetBPSystolic: 130,
      targetBPDiastolic: 80,
      targetGlucose: 140
    };

    try {
      await setDoc(doc(db, 'users', user.uid), profile);
      onComplete(profile);
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Primary Diagnosis</label>
        <select 
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value as Diagnosis)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="Type 2 Diabetes">Type 2 Diabetes</option>
          <option value="Hypertension">Hypertension</option>
          <option value="Both">Both</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
          <input 
            type="number" 
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Years"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Weight (kg)</label>
          <input 
            type="number" 
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="kg"
          />
        </div>
      </div>
      <button
        disabled={isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-50 mt-4"
      >
        {isSubmitting ? 'Saving...' : 'Get Started'}
      </button>
    </form>
  );
}
