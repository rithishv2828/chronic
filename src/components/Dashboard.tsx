import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp, doc } from 'firebase/firestore';
import { VitalLog, MedicationLog, MealLog, ActivityLog, HealthNudge, UserProfile } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Heart, Activity, Pill, Utensils, TrendingUp, AlertCircle, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { generateHealthNudge } from '../lib/gemini';

export default function Dashboard() {
  const [vitals, setVitals] = useState<VitalLog[]>([]);
  const [meds, setMeds] = useState<MedicationLog[]>([]);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [nudge, setNudge] = useState<HealthNudge | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Fetch Profile
    const profileUnsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) setProfile(doc.data() as UserProfile);
    });

    // Fetch Vitals (last 7 days)
    const vitalsQuery = query(
      collection(db, 'vitals'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const vitalsUnsub = onSnapshot(vitalsQuery, (snap) => {
      setVitals(snap.docs.map(d => ({ id: d.id, ...d.data() } as VitalLog)).reverse());
    });

    // Fetch Meds
    const medsQuery = query(
      collection(db, 'medications'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    const medsUnsub = onSnapshot(medsQuery, (snap) => {
      setMeds(snap.docs.map(d => ({ id: d.id, ...d.data() } as MedicationLog)));
    });

    // Fetch Meals
    const mealsQuery = query(
      collection(db, 'meals'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    const mealsUnsub = onSnapshot(mealsQuery, (snap) => {
      setMeals(snap.docs.map(d => ({ id: d.id, ...d.data() } as MealLog)));
    });

    // Fetch Activities
    const activitiesQuery = query(
      collection(db, 'activities'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    const activitiesUnsub = onSnapshot(activitiesQuery, (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog)));
      setLoading(false);
    });

    return () => {
      profileUnsub();
      vitalsUnsub();
      medsUnsub();
      mealsUnsub();
      activitiesUnsub();
    };
  }, []);

  // Generate Nudge
  useEffect(() => {
    if (profile && !loading && !nudge) {
      const triggerNudge = async () => {
        const result = await generateHealthNudge(profile, vitals, meds, meals, activities);
        setNudge({
          userId: profile.uid,
          timestamp: new Date().toISOString(),
          message: result.message,
          category: result.category
        });
      };
      triggerNudge();
    }
  }, [profile, loading]);

  const stats = [
    { label: 'Avg Glucose', value: vitals.filter(v => v.type === 'glucose').reduce((acc, curr) => acc + (curr.glucose || 0), 0) / (vitals.filter(v => v.type === 'glucose').length || 1), unit: 'mg/dL', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
    { label: 'Avg BP', value: '120/80', unit: 'mmHg', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Meds Taken', value: meds.filter(m => m.taken).length, unit: 'today', icon: Pill, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Activity', value: activities.reduce((acc, curr) => acc + curr.durationMinutes, 0), unit: 'min', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  const chartData = vitals.map(v => ({
    time: format(new Date(v.timestamp), 'MMM d, HH:mm'),
    glucose: v.glucose,
    systolic: v.systolic,
    diastolic: v.diastolic,
    weight: v.weight
  }));

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome back, {auth.currentUser?.displayName?.split(' ')[0]}</h1>
          <p className="text-slate-500">Here's your health overview for today.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-slate-700">Health Score: 85/100</span>
        </div>
      </header>

      {/* AI Nudge */}
      {nudge && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden"
        >
          <div className="relative z-10 flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Personalized Health Nudge</h3>
              <p className="text-blue-50 opacity-90 leading-relaxed">{nudge.message}</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="w-32 h-32" />
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <div className="flex items-baseline gap-1">
              <h4 className="text-2xl font-bold text-slate-900">
                {typeof stat.value === 'number' ? stat.value.toFixed(0) : stat.value}
              </h4>
              <span className="text-xs text-slate-400 font-medium">{stat.unit}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900">Glucose Trends</h3>
            <select className="text-sm bg-slate-50 border-none rounded-lg px-2 py-1 outline-none">
              <option>Last 7 Days</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.filter(d => d.glucose)}>
                <defs>
                  <linearGradient id="colorGlucose" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="glucose" stroke="#f43f5e" fillOpacity={1} fill="url(#colorGlucose)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900">Blood Pressure</h3>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Systolic</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-400" /> Diastolic</div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.filter(d => d.systolic)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="systolic" stroke="#3b82f6" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="diastolic" stroke="#818cf8" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Logs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {meals.slice(0, 3).map((meal, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Utensils className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 capitalize">{meal.mealType}</p>
                  <p className="text-xs text-slate-500">{meal.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{meal.calories || '--'} kcal</p>
                  <p className="text-xs text-slate-400">{format(new Date(meal.timestamp), 'HH:mm')}</p>
                </div>
              </div>
            ))}
            {activities.slice(0, 2).map((act, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Activity className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{act.activityType}</p>
                  <p className="text-xs text-slate-500">{act.intensity} intensity</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{act.durationMinutes} min</p>
                  <p className="text-xs text-slate-400">{format(new Date(act.timestamp), 'HH:mm')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-6">Medication Schedule</h3>
          <div className="space-y-4">
            {meds.slice(0, 5).map((med, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  med.taken ? "bg-emerald-500" : "bg-slate-300"
                )} />
                <div className="flex-1">
                  <p className={cn(
                    "text-sm font-medium",
                    med.taken ? "text-slate-500 line-through" : "text-slate-900"
                  )}>{med.medicationName}</p>
                  <p className="text-xs text-slate-400">{med.dosage}</p>
                </div>
                {!med.taken && (
                  <button className="text-xs font-bold text-blue-600 hover:text-blue-700">Mark Taken</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
