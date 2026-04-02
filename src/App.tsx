import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import LogEntryForm from './components/LogEntryForm';
import ReportGenerator from './components/ReportGenerator';
import Chatbot from './components/Chatbot';
import Hospitals from './components/Hospitals';
import Appointments from './components/Appointments';
import { Heart, Activity, Pill, Utensils } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'chat':
        return <Chatbot />;
      case 'hospitals':
        return <Hospitals />;
      case 'appointments':
        return <Appointments />;
      case 'vitals':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <LogEntryForm type="vitals" />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500" />
                  Vital History
                </h3>
                <p className="text-slate-500 italic text-sm">Your recent vital logs will appear here. Check the dashboard for trends.</p>
              </div>
            </div>
          </div>
        );
      case 'meds':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <LogEntryForm type="meds" />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-emerald-500" />
                  Medication Adherence
                </h3>
                <p className="text-slate-500 italic text-sm">Track your medication intake daily to maintain consistency.</p>
              </div>
            </div>
          </div>
        );
      case 'meals':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <LogEntryForm type="meals" />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-amber-500" />
                  Meal History
                </h3>
                <p className="text-slate-500 italic text-sm">Log your meals to understand the impact of nutrition on your vitals.</p>
              </div>
            </div>
          </div>
        );
      case 'activity':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <LogEntryForm type="activity" />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Physical Activity
                </h3>
                <p className="text-slate-500 italic text-sm">Regular movement is key to managing chronic conditions.</p>
              </div>
            </div>
          </div>
        );
      case 'report':
        return <ReportGenerator />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}
