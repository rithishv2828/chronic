import React, { useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { VitalType, VitalLog, MedicationLog, MealLog, ActivityLog } from '../types';
import { Heart, Activity, Pill, Utensils, Plus, Check, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { estimateMealNutrition } from '../lib/gemini';

interface LogEntryFormProps {
  type: 'vitals' | 'meds' | 'meals' | 'activity';
  onSuccess?: () => void;
}

export default function LogEntryForm({ type, onSuccess, setActiveTab }: LogEntryFormProps & { setActiveTab?: (tab: string) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!auth.currentUser) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-center space-y-4 transition-colors">
        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
          <Pill className="w-6 h-6 text-slate-400" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white">Sign in to log data</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Your health records are private and require authentication.</p>
        </div>
        <button
          onClick={() => setActiveTab?.('settings')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 rounded-lg transition-all"
        >
          Go to Sign In
        </button>
      </div>
    );
  }
  
  // Meal-specific state for auto-estimation
  const [mealDescription, setMealDescription] = useState('');
  const [calories, setCalories] = useState<string>('');
  const [carbs, setCarbs] = useState<string>('');
  const [isEstimating, setIsEstimating] = useState(false);

  // Debounce effect for calorie estimation
  React.useEffect(() => {
    if (type !== 'meals' || !mealDescription.trim() || mealDescription.length < 3) return;

    const timer = setTimeout(async () => {
      setIsEstimating(true);
      const result = await estimateMealNutrition(mealDescription);
      if (result.calories) setCalories(result.calories.toString());
      if (result.carbs) setCarbs(result.carbs.toString());
      setIsEstimating(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [mealDescription, type]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data: any = {
      userId: user.uid,
      timestamp: new Date().toISOString(),
    };

    formData.forEach((value, key) => {
      data[key] = isNaN(Number(value)) || value === '' ? value : Number(value);
    });

    // Handle specific fields
    if (type === 'meds') data.taken = true;

    try {
      await addDoc(collection(db, type === 'vitals' ? 'vitals' : type === 'meds' ? 'medications' : type === 'meals' ? 'meals' : 'activities'), data);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
      }, 2000);
      setMealDescription('');
      setCalories('');
      setCarbs('');
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("Failed to log data:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFields = () => {
    switch (type) {
      case 'vitals':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vital Type</label>
              <select name="type" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors">
                <option value="blood_pressure">Blood Pressure</option>
                <option value="glucose">Blood Glucose</option>
                <option value="weight">Weight</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Value 1 (Systolic/Glucose/Weight)</label>
                <input type="number" step="0.1" name="systolic" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors" placeholder="e.g. 120" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Value 2 (Diastolic)</label>
                <input type="number" step="0.1" name="diastolic" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors" placeholder="e.g. 80" />
              </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">* For Glucose/Weight, only use the first field.</p>
          </div>
        );
      case 'meds':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Medication Name</label>
              <input type="text" name="medicationName" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors" placeholder="e.g. Metformin" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dosage</label>
              <input type="text" name="dosage" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors" placeholder="e.g. 500mg" />
            </div>
          </div>
        );
      case 'meals':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Meal Type</label>
              <select name="mealType" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors">
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <textarea 
                name="description" 
                required 
                value={mealDescription}
                onChange={(e) => setMealDescription(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] text-slate-900 dark:text-white transition-colors" 
                placeholder="What did you eat? (e.g. 2 eggs and toast)" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Calories (est.)
                  {isEstimating && <Loader2 className="w-3 h-3 animate-spin inline ml-2 text-blue-500" />}
                </label>
                <input 
                  type="number" 
                  name="calories" 
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors" 
                />
                {!isEstimating && calories && (
                  <Sparkles className="absolute right-3 bottom-2.5 w-4 h-4 text-amber-500 opacity-50" />
                )}
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Carbs (g)</label>
                <input 
                  type="number" 
                  name="carbs" 
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors" 
                />
                {!isEstimating && carbs && (
                  <Sparkles className="absolute right-3 bottom-2.5 w-4 h-4 text-amber-500 opacity-50" />
                )}
              </div>
            </div>
          </div>
        );
      case 'activity':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Activity Type</label>
              <input type="text" name="activityType" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors" placeholder="e.g. Walking, Swimming" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duration (min)</label>
                <input type="number" name="durationMinutes" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Intensity</label>
                <select name="intensity" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white transition-colors">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>
        );
    }
  };

  const icons = {
    vitals: Heart,
    meds: Pill,
    meals: Utensils,
    activity: Activity
  };
  const Icon = icons[type];

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="font-bold text-slate-900 dark:text-white capitalize">Log {type}</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {renderFields()}
        
        <button
          type="submit"
          disabled={isSubmitting || success}
          className={cn(
            "w-full font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2",
            success 
              ? "bg-emerald-500 text-white" 
              : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white disabled:opacity-50"
          )}
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : success ? (
            <Check className="w-5 h-5" />
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Log Entry
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
