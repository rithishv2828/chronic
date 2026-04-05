import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp, doc } from 'firebase/firestore';
import { VitalLog, MedicationLog, MealLog, ActivityLog, HealthNudge, UserProfile } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, Legend } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Heart, Activity, Pill, Utensils, TrendingUp, AlertCircle, ChevronRight, Sparkles, Clock, LayoutDashboard } from 'lucide-react';
import { motion } from 'motion/react';
import { generateHealthNudge } from '../lib/gemini';
import { useTheme } from '../lib/ThemeContext';

export default function Dashboard({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { isDarkMode } = useTheme();
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
      limit(50)
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

  const avgGlucose = vitals.filter(v => v.type === 'glucose').length > 0 
    ? vitals.filter(v => v.type === 'glucose').reduce((acc, curr) => acc + (curr.glucose || 0), 0) / vitals.filter(v => v.type === 'glucose').length
    : 0;

  const latestBP = vitals.filter(v => v.type === 'blood_pressure').sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  const stats = [
    { 
      label: 'Avg Glucose', 
      value: avgGlucose, 
      unit: 'mg/dL', 
      icon: Heart, 
      color: avgGlucose > (profile?.targetGlucose || 140) ? 'text-rose-500' : 'text-emerald-500', 
      bg: avgGlucose > (profile?.targetGlucose || 140) ? 'bg-rose-50' : 'bg-emerald-50',
      target: profile?.targetGlucose ? `Target: <${profile.targetGlucose}` : undefined,
      status: avgGlucose > (profile?.targetGlucose || 140) ? 'warning' : 'normal'
    },
    { 
      label: 'Latest BP', 
      value: latestBP ? `${latestBP.systolic}/${latestBP.diastolic}` : '--/--', 
      unit: 'mmHg', 
      icon: TrendingUp, 
      color: latestBP && (latestBP.systolic! > (profile?.targetBPSystolic || 130) || latestBP.diastolic! > (profile?.targetBPDiastolic || 80)) ? 'text-rose-500' : 'text-blue-500', 
      bg: latestBP && (latestBP.systolic! > (profile?.targetBPSystolic || 130) || latestBP.diastolic! > (profile?.targetBPDiastolic || 80)) ? 'bg-rose-50' : 'bg-blue-50',
      target: profile?.targetBPSystolic ? `Target: <${profile.targetBPSystolic}/${profile.targetBPDiastolic}` : undefined,
      status: latestBP && (latestBP.systolic! > (profile?.targetBPSystolic || 130) || latestBP.diastolic! > (profile?.targetBPDiastolic || 80)) ? 'warning' : 'normal'
    },
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

  const activityChartData = activities.map(a => ({
    time: format(new Date(a.timestamp), 'MMM d'),
    duration: a.durationMinutes,
    intensity: a.intensity,
    type: a.activityType
  })).reverse();

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'high': return '#f59e0b'; // amber-500
      case 'medium': return '#3b82f6'; // blue-500
      case 'low': return '#94a3b8'; // slate-400
      default: return '#cbd5e1';
    }
  };

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), i);
    return format(d, 'yyyy-MM-dd');
  }).reverse();

  const nutritionChartData = last7Days.map(dateStr => {
    const dayMeals = meals.filter(m => format(new Date(m.timestamp), 'yyyy-MM-dd') === dateStr);
    return {
      date: format(new Date(dateStr), 'MMM d'),
      calories: dayMeals.reduce((acc, curr) => acc + (curr.calories || 0), 0),
      carbs: dayMeals.reduce((acc, curr) => acc + (curr.carbs || 0), 0),
      protein: dayMeals.reduce((acc, curr) => acc + (curr.protein || 0), 0),
      fat: dayMeals.reduce((acc, curr) => acc + (curr.fat || 0), 0),
    };
  });

  if (loading && auth.currentUser) return <div className="p-8 text-center text-slate-500 dark:text-slate-400 transition-colors">Loading your dashboard...</div>;

  if (!auth.currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
          <LayoutDashboard className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome to MECURA AI</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Please sign in to view your health dashboard, track your vitals, and get personalized AI insights.
          </p>
        </div>
        <button
          onClick={() => setActiveTab('settings')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all"
        >
          Go to Settings to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors">Welcome back, {auth.currentUser?.displayName?.split(' ')[0] || 'User'}</h1>
          <p className="text-slate-500 dark:text-slate-400 transition-colors">Here's your health overview for today.</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Health Score: 85/100</span>
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
            className={cn(
              "bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border transition-colors relative overflow-hidden",
              stat.status === 'warning' ? "border-rose-200 dark:border-rose-900/50" : "border-slate-100 dark:border-slate-800"
            )}
          >
            {stat.status === 'warning' && (
              <div className="absolute top-0 right-0 p-2">
                <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse" />
              </div>
            )}
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", stat.bg, "dark:bg-opacity-10")}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
            <div className="flex items-baseline gap-1">
              <h4 className={cn(
                "text-2xl font-bold transition-colors",
                stat.status === 'warning' ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
              )}>
                {typeof stat.value === 'number' ? stat.value.toFixed(0) : stat.value}
              </h4>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{stat.unit}</span>
            </div>
            {stat.target && (
              <p className={cn(
                "text-[10px] font-bold mt-1 uppercase tracking-wider",
                stat.status === 'warning' ? "text-rose-500" : "text-slate-400 dark:text-slate-500"
              )}>{stat.target}</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 dark:text-white">Glucose Trends</h3>
            <select className="text-sm bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-2 py-1 outline-none text-slate-600 dark:text-slate-300">
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                    color: isDarkMode ? '#f8fafc' : '#1e293b'
                  }}
                  itemStyle={{ color: isDarkMode ? '#f8fafc' : '#1e293b' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="glucose" 
                  stroke="#f43f5e" 
                  fillOpacity={1} 
                  fill="url(#colorGlucose)" 
                  strokeWidth={3}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 dark:text-white">Blood Pressure</h3>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><div className="w-2 h-2 rounded-full bg-blue-500" /> Systolic</div>
              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><div className="w-2 h-2 rounded-full bg-indigo-400" /> Diastolic</div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.filter(d => d.systolic)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                    color: isDarkMode ? '#f8fafc' : '#1e293b'
                  }}
                  itemStyle={{ color: isDarkMode ? '#f8fafc' : '#1e293b' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="systolic" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={false}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                />
                <Line 
                  type="monotone" 
                  dataKey="diastolic" 
                  stroke="#818cf8" 
                  strokeWidth={3} 
                  dot={false}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                  animationBegin={300}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Activity Trends */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Physical Activity Trends</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Duration and intensity of your recent exercises.</p>
          </div>
          <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> High</div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Medium</div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400"><div className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Low</div>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} />
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10 }}
                label={{ value: 'Minutes', angle: -90, position: 'insideLeft', style: { fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 'bold' } }}
              />
              <Tooltip 
                cursor={{ fill: isDarkMode ? '#1e293b' : '#f8fafc' }}
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                  fontSize: '12px',
                  backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                  color: isDarkMode ? '#f8fafc' : '#1e293b'
                }}
                itemStyle={{ color: isDarkMode ? '#f8fafc' : '#1e293b' }}
                formatter={(value: number, name: string, props: any) => [
                  `${value} min (${props.payload.type})`, 
                  `Intensity: ${props.payload.intensity.toUpperCase()}`
                ]}
              />
              <Bar 
                dataKey="duration" 
                radius={[6, 6, 0, 0]} 
                barSize={40}
                animationDuration={1500}
                animationEasing="ease-in-out"
              >
                {activityChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getIntensityColor(entry.intensity)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Nutritional Breakdown */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Nutritional Breakdown</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Daily intake of calories and macronutrients over the last week.</p>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={nutritionChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10 }}
              />
              <YAxis 
                yAxisId="left"
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10 }}
                label={{ value: 'Grams', angle: -90, position: 'insideLeft', style: { fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 'bold' } }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10 }}
                label={{ value: 'Calories', angle: 90, position: 'insideRight', style: { fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 'bold' } }}
              />
              <Tooltip 
                cursor={{ fill: isDarkMode ? '#1e293b' : '#f8fafc' }}
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                  fontSize: '12px',
                  backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                  color: isDarkMode ? '#f8fafc' : '#1e293b'
                }}
                itemStyle={{ color: isDarkMode ? '#f8fafc' : '#1e293b' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              <Bar yAxisId="right" dataKey="calories" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Calories (kcal)" />
              <Bar yAxisId="left" dataKey="carbs" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Carbs (g)" />
              <Bar yAxisId="left" dataKey="protein" fill="#10b981" radius={[4, 4, 0, 0]} name="Protein (g)" />
              <Bar yAxisId="left" dataKey="fat" fill="#ef4444" radius={[4, 4, 0, 0]} name="Fat (g)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Recent Logs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {vitals.slice(0, 3).map((v, i) => {
              const isHigh = v.type === 'glucose' 
                ? (v.glucose || 0) > (profile?.targetGlucose || 140)
                : v.type === 'blood_pressure' 
                  ? (v.systolic || 0) > (profile?.targetBPSystolic || 130) || (v.diastolic || 0) > (profile?.targetBPDiastolic || 80)
                  : false;
              
              return (
                <div key={i} className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-colors",
                  isHigh ? "bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30" : "bg-slate-50 dark:bg-slate-800/50 border-transparent dark:border-slate-800"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shadow-sm",
                    isHigh ? "bg-rose-100 dark:bg-rose-900/30" : "bg-white dark:bg-slate-800"
                  )}>
                    {v.type === 'blood_pressure' ? <TrendingUp className={cn("w-5 h-5", isHigh ? "text-rose-600" : "text-blue-500")} /> : <Heart className={cn("w-5 h-5", isHigh ? "text-rose-600" : "text-rose-500")} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white capitalize">{v.type.replace('_', ' ')}</p>
                      {isHigh && <AlertCircle className="w-3 h-3 text-rose-500 animate-pulse" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{v.notes || 'Routine check'}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-bold",
                      isHigh ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
                    )}>
                      {v.type === 'blood_pressure' ? `${v.systolic}/${v.diastolic}` : v.type === 'glucose' ? `${v.glucose} mg/dL` : `${v.weight} kg`}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{format(new Date(v.timestamp), 'HH:mm')}</p>
                  </div>
                </div>
              );
            })}
            {meals.slice(0, 2).map((meal, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-transparent dark:border-slate-800 transition-colors">
                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center shadow-sm">
                  <Utensils className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white capitalize">{meal.mealType}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{meal.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{meal.calories || '--'} kcal</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{format(new Date(meal.timestamp), 'HH:mm')}</p>
                </div>
              </div>
            ))}
            {activities.slice(0, 2).map((act, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-transparent dark:border-slate-800 transition-colors">
                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center shadow-sm">
                  <Activity className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{act.activityType}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{act.intensity} intensity</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{act.durationMinutes} min</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{format(new Date(act.timestamp), 'HH:mm')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6">Medication Schedule</h3>
          <div className="space-y-4">
            {meds.slice(0, 5).map((med, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  med.taken ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                )} />
                <div className="flex-1">
                  <p className={cn(
                    "text-sm font-medium",
                    med.taken ? "text-slate-500 dark:text-slate-500 line-through" : "text-slate-900 dark:text-white"
                  )}>{med.medicationName}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{med.dosage}</p>
                </div>
                {!med.taken && (
                  <button className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">Mark Taken</button>
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
