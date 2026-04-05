import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { UserProfile, Diagnosis } from '../types';
import { useTheme } from '../lib/ThemeContext';
import { Settings as SettingsIcon, Save, Heart, Activity, TrendingUp, Sun, Moon, LogIn, LogOut, User as UserIcon } from 'lucide-react';

export default function Settings() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis>('Type 2 Diabetes');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [targetSystolic, setTargetSystolic] = useState('130');
  const [targetDiastolic, setTargetDiastolic] = useState('80');
  const [targetGlucose, setTargetGlucose] = useState('140');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        fetchProfile(u);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const fetchProfile = async (u: User) => {
    setIsLoading(true);
    const docRef = doc(db, 'users', u.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as UserProfile;
      setProfile(data);
      setDiagnosis(data.diagnosis);
      setAge(data.age?.toString() || '');
      setWeight(data.weight?.toString() || '');
      setTargetSystolic(data.targetBPSystolic?.toString() || '130');
      setTargetDiastolic(data.targetBPDiastolic?.toString() || '80');
      setTargetGlucose(data.targetGlucose?.toString() || '140');
    }
    setIsLoading(false);
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      setMessage({ type: 'error', text: 'Login failed. Please try again.' });
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    setIsSubmitting(true);
    setMessage(null);

    const updatedProfile: UserProfile = {
      ...profile!,
      diagnosis,
      age: parseInt(age) || undefined,
      weight: parseFloat(weight) || undefined,
      targetBPSystolic: parseInt(targetSystolic) || 130,
      targetBPDiastolic: parseInt(targetDiastolic) || 80,
      targetGlucose: parseInt(targetGlucose) || 140,
    };

    try {
      await setDoc(doc(db, 'users', user.uid), updatedProfile);
      setProfile(updatedProfile);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error("Failed to update profile:", error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400 transition-colors">Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 transition-colors">
            <SettingsIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Settings & Goals
          </h1>
          <p className="text-slate-500 dark:text-slate-400 transition-colors">Manage your health targets and profile information.</p>
        </div>
        {!user ? (
          <button
            onClick={handleLogin}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl shadow-md transition-all"
          >
            <LogIn className="w-5 h-5" />
            Sign In with Google
          </button>
        ) : (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-white dark:bg-slate-900 text-red-500 font-semibold py-2.5 px-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          {!user ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-12 text-center space-y-6 transition-colors">
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto">
                <UserIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Sign in to manage your health</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Connect your Google account to save your health targets, track your progress, and get personalized AI insights.
                </p>
              </div>
              <button
                onClick={handleLogin}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all"
              >
                <LogIn className="w-5 h-5" />
                Sign In Now
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 space-y-6 transition-colors">
              {message && (
                <div className={`p-4 rounded-xl text-sm font-medium ${
                  message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b dark:border-slate-800 pb-2 transition-colors">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Primary Diagnosis</label>
                    <select 
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value as Diagnosis)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors"
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
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Weight (kg)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b dark:border-slate-800 pb-2 transition-colors">Theme Preference</h3>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    {isDarkMode ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Dark Mode</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Adjust the appearance of the application</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleDarkMode}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isDarkMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b dark:border-slate-800 pb-2 transition-colors">Health Targets</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target Systolic (mmHg)</label>
                    <input 
                      type="number" 
                      value={targetSystolic}
                      onChange={(e) => setTargetSystolic(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target Diastolic (mmHg)</label>
                    <input 
                      type="number" 
                      value={targetDiastolic}
                      onChange={(e) => setTargetDiastolic(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target Glucose (mg/dL)</label>
                    <input 
                      type="number" 
                      value={targetGlucose}
                      onChange={(e) => setTargetGlucose(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 italic transition-colors">Consult with your healthcare provider before setting these targets.</p>
              </div>

              <button
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {isSubmitting ? 'Saving Changes...' : 'Save All Changes'}
              </button>
            </form>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 transition-colors">Why set targets?</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-rose-50 dark:bg-rose-900/20 rounded-lg flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 transition-colors">Targets help the AI Assistant provide more accurate and personalized health nudges.</p>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 transition-colors">Visualizing your progress against goals keeps you motivated and on track.</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 dark:bg-slate-800 p-6 rounded-2xl text-white transition-colors">
            <h3 className="font-bold mb-2">Need help?</h3>
            <p className="text-sm text-slate-400 mb-4">Ask our AI Assistant for evidence-based advice on setting healthy targets for your condition.</p>
            <button className="w-full bg-white/10 hover:bg-white/20 text-white text-sm font-semibold py-2 rounded-lg transition-colors">
              Open Assistant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
