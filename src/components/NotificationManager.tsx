import React, { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { MedicationSchedule } from '../types';
import { format, addMinutes, isAfter, parseISO } from 'date-fns';
import { Pill, Bell, Clock, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function NotificationManager() {
  const [schedules, setSchedules] = useState<MedicationSchedule[]>([]);
  const [activeNotification, setActiveNotification] = useState<MedicationSchedule | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, 'medicationSchedules'), where('userId', '==', user.uid), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, (snap) => {
      setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() } as MedicationSchedule)));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentDay = format(now, 'EEE');
      const currentTime = format(now, 'HH:mm');

      schedules.forEach(schedule => {
        // Check if it's the right day
        if (!schedule.days.includes(currentDay)) return;

        const lastNotified = schedule.lastNotified ? new Date(schedule.lastNotified) : null;
        const isSameMinuteAsLast = lastNotified && format(lastNotified, 'yyyy-MM-dd HH:mm') === format(now, 'yyyy-MM-dd HH:mm');

        if (isSameMinuteAsLast) return;

        // If currently snoozed, don't trigger original reminder
        if (schedule.snoozedUntil && isAfter(parseISO(schedule.snoozedUntil), now)) return;

        let shouldNotify = false;

        // Check if it's the scheduled time
        if (schedule.reminderTime === currentTime) {
          shouldNotify = true;
        }

        // Check if snooze time is reached
        if (schedule.snoozedUntil) {
          const snoozeDate = parseISO(schedule.snoozedUntil);
          if (now >= snoozeDate) {
            shouldNotify = true;
            // Clear snooze after triggering
            if (schedule.id) {
              updateDoc(doc(db, 'medicationSchedules', schedule.id), {
                snoozedUntil: null
              });
            }
          }
        }

        if (shouldNotify) {
          triggerNotification(schedule);
        }
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [schedules]);

  const triggerNotification = (schedule: MedicationSchedule) => {
    // Browser Notification
    if (Notification.permission === 'granted') {
      new Notification(`Medication Reminder: ${schedule.medicationName}`, {
        body: `Time to take your ${schedule.dosage}.`,
        icon: '/favicon.ico'
      });
    }

    // In-app Notification
    setActiveNotification(schedule);

    // Update lastNotified
    if (schedule.id) {
      updateDoc(doc(db, 'medicationSchedules', schedule.id), {
        lastNotified: new Date().toISOString()
      });
    }
  };

  const handleSnooze = async (minutes: number) => {
    if (!activeNotification || !activeNotification.id) return;
    const snoozeUntil = addMinutes(new Date(), minutes).toISOString();
    try {
      await updateDoc(doc(db, 'medicationSchedules', activeNotification.id), {
        snoozedUntil: snoozeUntil
      });
      setActiveNotification(null);
    } catch (error) {
      console.error("Failed to snooze:", error);
    }
  };

  const handleDismiss = () => {
    setActiveNotification(null);
  };

  return (
    <AnimatePresence>
      {activeNotification && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className="fixed bottom-6 right-6 z-[100] w-full max-w-sm"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-blue-100 dark:border-slate-800 overflow-hidden transition-colors">
            <div className="bg-blue-600 dark:bg-blue-500 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Bell className="w-5 h-5 animate-bounce" />
                <span className="font-bold">Medication Reminder</span>
              </div>
              <button onClick={handleDismiss} className="text-white/80 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center transition-colors">
                  <Pill className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white transition-colors">{activeNotification.medicationName}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors">{activeNotification.dosage}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSnooze(10)}
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-all text-sm"
                >
                  <Clock className="w-4 h-4" />
                  Snooze 10m
                </button>
                <button
                  onClick={handleDismiss}
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-xl font-semibold transition-all text-sm"
                >
                  <Check className="w-4 h-4" />
                  Taken
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
