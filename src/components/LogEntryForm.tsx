import React, { useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { VitalType, VitalLog, MedicationLog, MealLog, ActivityLog } from '../types';
import { Heart, Activity, Pill, Utensils, Plus, Check, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface LogEntryFormProps {
  type: 'vitals' | 'meds' | 'meals' | 'activity';
  onSuccess?: () => void;
}

export default function LogEntryForm({ type, onSuccess }: LogEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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
              <label className="block text-sm font-medium text-slate-700 mb-1">Vital Type</label>
              <select name="type" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="blood_pressure">Blood Pressure</option>
                <option value="glucose">Blood Glucose</option>
                <option value="weight">Weight</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Value 1 (Systolic/Glucose/Weight)</label>
                <input type="number" step="0.1" name="systolic" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 120" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Value 2 (Diastolic)</label>
                <input type="number" step="0.1" name="diastolic" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 80" />
              </div>
            </div>
            <p className="text-xs text-slate-400">* For Glucose/Weight, only use the first field.</p>
          </div>
        );
      case 'meds':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Medication Name</label>
              <input type="text" name="medicationName" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Metformin" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dosage</label>
              <input type="text" name="dosage" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 500mg" />
            </div>
          </div>
        );
      case 'meals':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Meal Type</label>
              <select name="mealType" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea name="description" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]" placeholder="What did you eat?" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Calories (est.)</label>
                <input type="number" name="calories" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Carbs (g)</label>
                <input type="number" name="carbs" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>
        );
      case 'activity':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Activity Type</label>
              <input type="text" name="activityType" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Walking, Swimming" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (min)</label>
                <input type="number" name="durationMinutes" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Intensity</label>
                <select name="intensity" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
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
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className="font-bold text-slate-900 capitalize">Log {type}</h3>
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
              : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
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
