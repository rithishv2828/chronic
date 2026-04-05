import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import LogEntryForm from './components/LogEntryForm';
import ReportGenerator from './components/ReportGenerator';
import Chatbot from './components/Chatbot';
import Hospitals from './components/Hospitals';
import Appointments from './components/Appointments';
import MedicationReminders from './components/MedicationReminders';
import Settings from './components/Settings';
import { Heart, Activity, Pill, Utensils } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'chat':
        return <Chatbot setActiveTab={setActiveTab} />;
      case 'hospitals':
        return <Hospitals setActiveTab={setActiveTab} />;
      case 'appointments':
        return <Appointments setActiveTab={setActiveTab} />;
      case 'reminders':
        return <MedicationReminders setActiveTab={setActiveTab} />;
      case 'vitals':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <LogEntryForm type="vitals" setActiveTab={setActiveTab} />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 transition-colors">
                  <Heart className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                  Vital History
                </h3>
                <p className="text-slate-500 dark:text-slate-400 italic text-sm transition-colors">Your recent vital logs will appear here. Check the dashboard for trends.</p>
              </div>
            </div>
          </div>
        );
      case 'meds':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <LogEntryForm type="meds" setActiveTab={setActiveTab} />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 transition-colors">
                  <Pill className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  Medication Adherence
                </h3>
                <p className="text-slate-500 dark:text-slate-400 italic text-sm transition-colors">Track your medication intake daily to maintain consistency.</p>
              </div>
            </div>
          </div>
        );
      case 'meals':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <LogEntryForm type="meals" setActiveTab={setActiveTab} />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 transition-colors">
                  <Utensils className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                  Meal History
                </h3>
                <p className="text-slate-500 dark:text-slate-400 italic text-sm transition-colors">Log your meals to understand the impact of nutrition on your vitals.</p>
              </div>
            </div>
          </div>
        );
      case 'activity':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <LogEntryForm type="activity" setActiveTab={setActiveTab} />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 transition-colors">
                  <Activity className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  Physical Activity
                </h3>
                <p className="text-slate-500 dark:text-slate-400 italic text-sm transition-colors">Regular movement is key to managing chronic conditions.</p>
              </div>
            </div>
          </div>
        );
      case 'report':
        return <ReportGenerator setActiveTab={setActiveTab} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}
