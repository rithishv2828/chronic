import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { MedicationSchedule } from '../types';
import { Pill, Clock, Plus, Trash2, Bell, BellOff, Check, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function MedicationReminders({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const [schedules, setSchedules] = useState<MedicationSchedule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'medicationSchedules'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() } as MedicationSchedule)));
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleAddSchedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const selectedDays = daysOfWeek.filter(day => formData.get(`day-${day}`));

    const data: Omit<MedicationSchedule, 'id'> = {
      userId: user.uid,
      medicationName: formData.get('medicationName') as string,
      dosage: formData.get('dosage') as string,
      reminderTime: formData.get('reminderTime') as string,
      days: selectedDays,
      isActive: true
    };

    try {
      await addDoc(collection(db, 'medicationSchedules'), data);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to add schedule:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (schedule: MedicationSchedule) => {
    if (!schedule.id) return;
    try {
      await updateDoc(doc(db, 'medicationSchedules', schedule.id), {
        isActive: !schedule.isActive
      });
    } catch (error) {
      console.error("Failed to toggle schedule:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this reminder?")) return;
    try {
      await deleteDoc(doc(db, 'medicationSchedules', id));
    } catch (error) {
      console.error("Failed to delete schedule:", error);
    }
  };

  const requestPermission = () => {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        alert("Notifications enabled!");
      }
    });
  };

  if (!auth.currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
          <Bell className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Medication Reminders</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Please sign in to set up and manage your medication schedules and receive timely notifications.
          </p>
        </div>
        <button
          onClick={() => setActiveTab?.('settings')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all"
        >
          Go to Settings to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">Medication Reminders</h2>
          <p className="text-slate-500 dark:text-slate-400 transition-colors">Set custom times to get notified about your medications.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={requestPermission}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold py-2 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            <Bell className="w-4 h-4" />
            Enable Notifications
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-xl transition-all flex items-center gap-2 shadow-md shadow-blue-200 dark:shadow-none"
          >
            <Plus className="w-5 h-5" />
            Add Reminder
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading reminders...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-center transition-colors">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Pill className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Reminders Set</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
            Stay on track with your treatment by setting up medication reminders.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schedules.map((s) => (
            <motion.div
              key={s.id}
              layout
              className={cn(
                "bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border transition-all relative group",
                s.isActive ? "border-slate-100 dark:border-slate-800" : "border-slate-100 dark:border-slate-800 opacity-60"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                  s.isActive ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600"
                )}>
                  <Pill className="w-6 h-6" />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => toggleActive(s)}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      s.isActive ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" : "text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                    )}
                  >
                    {s.isActive ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => s.id && handleDelete(s.id)}
                    className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-slate-900 dark:text-white mb-1">{s.medicationName}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{s.dosage}</p>

              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold mb-4">
                <Clock className="w-4 h-4" />
                {s.reminderTime}
                {s.snoozedUntil && new Date(s.snoozedUntil) > new Date() && (
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full animate-pulse ml-2">
                    Snoozed until {format(new Date(s.snoozedUntil), 'HH:mm')}
                  </span>
                )}
              </div>

              <div className="flex gap-1">
                {daysOfWeek.map(day => (
                  <div 
                    key={day}
                    className={cn(
                      "text-[10px] font-bold w-7 h-7 rounded-full flex items-center justify-center",
                      s.days.includes(day) 
                        ? "bg-blue-600 dark:bg-blue-500 text-white" 
                        : "bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600"
                    )}
                  >
                    {day[0]}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-8 relative border border-slate-100 dark:border-slate-800"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Add Medication Reminder</h2>
              
              <form onSubmit={handleAddSchedule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Medication Name</label>
                  <input type="text" name="medicationName" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" placeholder="e.g. Metformin" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dosage</label>
                  <input type="text" name="dosage" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" placeholder="e.g. 500mg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reminder Time</label>
                  <input type="time" name="reminderTime" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Repeat Days</label>
                  <div className="flex flex-wrap gap-2">
                    {daysOfWeek.map(day => (
                      <label key={day} className="flex items-center gap-1 cursor-pointer group">
                        <input type="checkbox" name={`day-${day}`} className="hidden peer" defaultChecked />
                        <div className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-bold peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 dark:peer-checked:bg-blue-500 dark:peer-checked:border-blue-500 transition-all text-slate-600 dark:text-slate-400">
                          {day}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  {isSubmitting ? 'Saving...' : 'Set Reminder'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
