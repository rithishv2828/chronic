import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Appointment } from '../types';
import { Calendar, Clock, MapPin, User, Plus, Trash2, CheckCircle2, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'appointments'),
      where('userId', '==', user.uid),
      orderBy('date', 'asc'),
      orderBy('time', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleAddAppointment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data: any = {
      userId: user.uid,
      doctorName: formData.get('doctorName'),
      specialty: formData.get('specialty'),
      date: formData.get('date'),
      time: formData.get('time'),
      location: formData.get('location'),
      status: 'upcoming',
      notes: formData.get('notes')
    };

    try {
      await addDoc(collection(db, 'appointments'), data);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to book appointment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await deleteDoc(doc(db, 'appointments', id));
    } catch (error) {
      console.error("Failed to delete appointment:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Appointments</h2>
          <p className="text-slate-500">Manage your upcoming doctor visits and health checkups.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-xl transition-all flex items-center gap-2 shadow-md shadow-blue-200"
        >
          <Plus className="w-5 h-5" />
          Book Appointment
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-slate-500 font-medium">Loading your appointments...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Appointments Found</h3>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            You don't have any upcoming appointments scheduled. Click the button above to book one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {appointments.map((appt, i) => (
              <motion.div
                key={appt.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <Calendar className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <button 
                    onClick={() => appt.id && handleDelete(appt.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{appt.doctorName}</h3>
                <p className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md inline-block mb-4">{appt.specialty}</p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {format(new Date(appt.date), 'EEEE, MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {appt.time}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {appt.location}
                  </div>
                </div>

                {appt.notes && (
                  <div className="mt-4 pt-4 border-t border-slate-50">
                    <p className="text-xs text-slate-400 italic">Notes: {appt.notes}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Booking Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Book New Appointment</h2>
              
              <form onSubmit={handleAddAppointment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Doctor Name</label>
                  <input type="text" name="doctorName" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Dr. Smith" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Specialty</label>
                  <input type="text" name="specialty" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Endocrinologist" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <input type="date" name="date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                    <input type="time" name="time" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location / Clinic</label>
                  <input type="text" name="location" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. City General Hospital" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                  <textarea name="notes" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]" placeholder="Reason for visit..." />
                </div>
                <button
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  {isSubmitting ? 'Booking...' : 'Confirm Appointment'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
