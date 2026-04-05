import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, Diagnosis } from '../types';
import { Heart, Activity, Pill, Utensils, LayoutDashboard, FileText, Settings, LogOut, Menu, X, MessageSquare, MapPin, Calendar, Bell, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import NotificationManager from './NotificationManager';

import { useTheme } from '../lib/ThemeContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { isDarkMode, toggleDarkMode } = useTheme();
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
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'chat', label: 'AI Assistant', icon: MessageSquare },
    { id: 'hospitals', label: 'Nearby Hospitals', icon: MapPin },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'report', label: 'Report', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300">
      <NotificationManager />
      {/* Mobile Sidebar Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-900 rounded-lg shadow-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
      >
        {isSidebarOpen ? <X /> : <Menu />}
      </button>

      {/* Theme Toggle - Top Right */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full shadow-md border border-slate-200 dark:border-slate-800 transition-all">
          <Sun className={cn("w-4 h-4 transition-colors", isDarkMode ? "text-slate-400" : "text-amber-500")} />
          <button
            onClick={toggleDarkMode}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900",
              isDarkMode ? "bg-blue-600" : "bg-slate-200"
            )}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                isDarkMode ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
          <Moon className={cn("w-4 h-4 transition-colors", isDarkMode ? "text-blue-400" : "text-slate-400")} />
        </div>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <Heart className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <span className="text-xl font-bold text-slate-900 dark:text-white">MECURA AI</span>
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
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <button
              onClick={toggleDarkMode}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all"
            >
              <div className="flex items-center gap-3">
                {isDarkMode ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                <span className="font-medium">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
              </div>
              <div className={cn(
                "w-8 h-4 rounded-full relative transition-colors",
                isDarkMode ? "bg-blue-600" : "bg-slate-300"
              )}>
                <div className={cn(
                  "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                  isDarkMode ? "left-4.5" : "left-0.5"
                )} />
              </div>
            </button>

            {user ? (
              <>
                <div className="flex items-center gap-3 px-4 py-3">
                  <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                    className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"
                    alt="Profile"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.displayName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{profile?.diagnosis || 'Setting up...'}</p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </>
            ) : (
              <button 
                onClick={() => setActiveTab('settings')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all"
              >
                <LogOut className="w-5 h-5 rotate-180" />
                Sign In
              </button>
            )}
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
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-8 border border-slate-100 dark:border-slate-800"
            >
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Complete Your Profile</h2>
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
  const [targetSystolic, setTargetSystolic] = useState('130');
  const [targetDiastolic, setTargetDiastolic] = useState('80');
  const [targetGlucose, setTargetGlucose] = useState('140');
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
      targetBPSystolic: parseInt(targetSystolic) || 130,
      targetBPDiastolic: parseInt(targetDiastolic) || 80,
      targetGlucose: parseInt(targetGlucose) || 140
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
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Primary Diagnosis</label>
        <select 
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value as Diagnosis)}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
        >
          <option value="Type 2 Diabetes">Type 2 Diabetes</option>
          <option value="Hypertension">Hypertension</option>
          <option value="Both">Both</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Age</label>
          <input 
            type="number" 
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
            placeholder="Years"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Weight (kg)</label>
          <input 
            type="number" 
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
            placeholder="kg"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target Systolic (mmHg)</label>
          <input 
            type="number" 
            value={targetSystolic}
            onChange={(e) => setTargetSystolic(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
            placeholder="130"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target Diastolic (mmHg)</label>
          <input 
            type="number" 
            value={targetDiastolic}
            onChange={(e) => setTargetDiastolic(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
            placeholder="80"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target Glucose (mg/dL)</label>
        <input 
          type="number" 
          value={targetGlucose}
          onChange={(e) => setTargetGlucose(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
          placeholder="140"
        />
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
