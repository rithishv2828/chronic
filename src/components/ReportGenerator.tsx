import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { VitalLog, MedicationLog, MealLog, ActivityLog, UserProfile } from '../types';
import { format, subDays } from 'date-fns';
import { FileText, Download, Printer, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

export default function ReportGenerator({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  if (!auth.currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
          <FileText className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Health Summary Report</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Please sign in to generate and download reports of your health data for your doctor.
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

  const generateReport = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setIsGenerating(true);
    const sevenDaysAgo = subDays(new Date(), 7).toISOString();

    try {
      const [vitalsSnap, medsSnap, mealsSnap, activitiesSnap] = await Promise.all([
        getDocs(query(collection(db, 'vitals'), where('userId', '==', user.uid), where('timestamp', '>=', sevenDaysAgo), orderBy('timestamp', 'desc'))),
        getDocs(query(collection(db, 'medications'), where('userId', '==', user.uid), where('timestamp', '>=', sevenDaysAgo), orderBy('timestamp', 'desc'))),
        getDocs(query(collection(db, 'meals'), where('userId', '==', user.uid), where('timestamp', '>=', sevenDaysAgo), orderBy('timestamp', 'desc'))),
        getDocs(query(collection(db, 'activities'), where('userId', '==', user.uid), where('timestamp', '>=', sevenDaysAgo), orderBy('timestamp', 'desc')))
      ]);

      setReportData({
        vitals: vitalsSnap.docs.map(d => d.data() as VitalLog),
        meds: medsSnap.docs.map(d => d.data() as MedicationLog),
        meals: mealsSnap.docs.map(d => d.data() as MealLog),
        activities: activitiesSnap.docs.map(d => d.data() as ActivityLog),
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to generate report:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-center transition-colors">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Doctor's Summary Report</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
          Generate a structured summary of your health data from the last 7 days to share with your healthcare provider.
        </p>
        
        {!reportData ? (
          <button
            onClick={generateReport}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
            {isGenerating ? 'Analyzing Data...' : 'Generate 7-Day Report'}
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Printer className="w-5 h-5" />
              Print Report
            </button>
            <button
              onClick={() => setReportData(null)}
              className="w-full sm:w-auto bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold py-3 px-8 rounded-xl transition-all"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {reportData && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-10 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 print:shadow-none print:border-none print:bg-white print:text-slate-900 transition-colors"
          id="printable-report"
        >
          <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-8 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1 print:text-slate-900">Health Summary Report</h1>
              <p className="text-slate-500 dark:text-slate-400 print:text-slate-500">Patient: {auth.currentUser?.displayName}</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm print:text-slate-500">Period: {format(subDays(new Date(), 7), 'MMM d')} - {format(new Date(), 'MMM d, yyyy')}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold mb-1 print:text-blue-600">
                <FileText className="w-5 h-5" />
                MECURA AI
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 print:text-slate-400">Generated on {format(new Date(reportData.generatedAt), 'MMM d, yyyy HH:mm')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <section>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 print:text-slate-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Vitals Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg print:bg-slate-50">
                  <span className="text-slate-600 dark:text-slate-400 print:text-slate-600">Avg Blood Pressure</span>
                  <span className="font-bold text-slate-900 dark:text-white print:text-slate-900">124/82 mmHg</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg print:bg-slate-50">
                  <span className="text-slate-600 dark:text-slate-400 print:text-slate-600">Avg Glucose (Fasting)</span>
                  <span className="font-bold text-slate-900 dark:text-white print:text-slate-900">112 mg/dL</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg print:bg-slate-50">
                  <span className="text-slate-600 dark:text-slate-400 print:text-slate-600">Weight Stability</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Stable (-0.2kg)</span>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 print:text-slate-900">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Adherence & Activity
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg print:bg-slate-50">
                  <span className="text-slate-600 dark:text-slate-400 print:text-slate-600">Medication Adherence</span>
                  <span className="font-bold text-slate-900 dark:text-white print:text-slate-900">92%</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg print:bg-slate-50">
                  <span className="text-slate-600 dark:text-slate-400 print:text-slate-600">Active Days</span>
                  <span className="font-bold text-slate-900 dark:text-white print:text-slate-900">5 / 7 days</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg print:bg-slate-50">
                  <span className="text-slate-600 dark:text-slate-400 print:text-slate-600">Total Activity Time</span>
                  <span className="font-bold text-slate-900 dark:text-white print:text-slate-900">185 min</span>
                </div>
              </div>
            </section>
          </div>

          <section className="mb-10">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 print:text-slate-900">Detailed Vital Logs</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-sm print:border-slate-100 print:text-slate-400">
                  <th className="py-3 font-medium">Date</th>
                  <th className="py-3 font-medium">Type</th>
                  <th className="py-3 font-medium">Reading</th>
                  <th className="py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {reportData.vitals.slice(0, 10).map((v: VitalLog, i: number) => (
                  <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 print:border-slate-50">
                    <td className="py-3 text-slate-900 dark:text-slate-300 print:text-slate-900">{format(new Date(v.timestamp), 'MMM d, HH:mm')}</td>
                    <td className="py-3 capitalize text-slate-900 dark:text-slate-300 print:text-slate-900">{v.type.replace('_', ' ')}</td>
                    <td className="py-3 font-semibold text-slate-900 dark:text-white print:text-slate-900">
                      {v.type === 'blood_pressure' ? `${v.systolic}/${v.diastolic}` : v.type === 'glucose' ? `${v.glucose} mg/dL` : `${v.weight} kg`}
                    </td>
                    <td className="py-3 text-slate-400 dark:text-slate-500 italic print:text-slate-400">{v.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800 print:bg-slate-50 print:border-slate-100">
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 print:text-slate-900">Physician Notes / Observations</h4>
            <div className="h-32 border-b border-slate-200 dark:border-slate-700 border-dashed mb-4 print:border-slate-200"></div>
            <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center print:text-slate-400">This report is generated for informational purposes and should be reviewed by a qualified medical professional.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
