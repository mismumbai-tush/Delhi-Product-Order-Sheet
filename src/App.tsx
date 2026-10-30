import React, { useState } from 'react';
import { Header } from './components/Header';
import { SpreadsheetSimulator } from './components/SpreadsheetSimulator';
import { CodeViewer } from './components/CodeViewer';
import { FirebaseSyncHub } from './components/FirebaseSyncHub';
import { SupabaseAdvisor } from './components/SupabaseAdvisor';
import { ColumnMapper } from './components/ColumnMapper';
import { SetupGuide } from './components/SetupGuide';
import { generateGasCode, defaultGasConfig } from './utils/gasGenerator';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'firebase' | 'advisor' | 'columns' | 'guide'>('simulator');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    const code = generateGasCode(defaultGasConfig);
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onCopyCode={handleCopyCode}
        copied={copied}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'firebase' && <FirebaseSyncHub />}
        {activeTab === 'simulator' && <SpreadsheetSimulator />}
        {activeTab === 'code' && <CodeViewer onCopyCode={handleCopyCode} copied={copied} />}
        {activeTab === 'advisor' && <SupabaseAdvisor />}
        {activeTab === 'columns' && <ColumnMapper />}
        {activeTab === 'guide' && <SetupGuide />}
      </main>

      {/* Quiet Footer adhering to Anti-Slop Discipline */}
      <footer className="border-t border-slate-200 bg-white py-5 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <span>GINZA FMS Order Automation &amp; Architecture Studio</span>
            <span className="mx-2">·</span>
            <span>Product Order → Product Automation &amp; Closed Orders</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('firebase')}
              className="hover:text-amber-700 font-bold text-amber-800 transition-colors"
            >
              🔥 Firebase Sync Hub
            </button>
            <button
              onClick={() => setActiveTab('advisor')}
              className="hover:text-emerald-700 font-medium transition-colors"
            >
              Big Data Architecture
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className="hover:text-slate-800 transition-colors"
            >
              Spreadsheet Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className="hover:text-slate-800 transition-colors"
            >
              Copy Script
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className="hover:text-slate-800 transition-colors"
            >
              Installation Steps
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
