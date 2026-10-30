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
  const [isFullWidth, setIsFullWidth] = useState<boolean>(true); // Default to Full Size for Google Sheet experience

  const handleCopyCode = () => {
    const code = generateGasCode(defaultGasConfig);
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Top Header with Live Connected Google IDs Bar & Full-Size Controls */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onCopyCode={handleCopyCode}
        copied={copied}
        isFullWidth={isFullWidth}
        setIsFullWidth={setIsFullWidth}
      />

      {/* Main Content Area - Full Size or Boxed Container */}
      <main
        className={`flex-1 w-full mx-auto py-3 transition-all duration-150 ${
          isFullWidth ? 'px-2 sm:px-4 max-w-[100vw]' : 'max-w-7xl px-4 sm:px-6 lg:px-8'
        }`}
      >
        {activeTab === 'firebase' && <FirebaseSyncHub />}
        {activeTab === 'simulator' && <SpreadsheetSimulator isFullWidth={isFullWidth} setIsFullWidth={setIsFullWidth} />}
        {activeTab === 'code' && <CodeViewer onCopyCode={handleCopyCode} copied={copied} />}
        {activeTab === 'advisor' && <SupabaseAdvisor />}
        {activeTab === 'columns' && <ColumnMapper />}
        {activeTab === 'guide' && <SetupGuide />}
      </main>

      {/* Quiet Clean Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-8">
        <div
          className={`mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 ${
            isFullWidth ? 'px-4' : 'max-w-7xl px-4 sm:px-6 lg:px-8'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">GINZA FMS Cloud Sheet Engine</span>
            <span>·</span>
            <span>Connected: mis.mumbai@ginzalimited.com</span>
            <span>·</span>
            <span className="text-emerald-700 font-medium">100k Rows Optimized</span>
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
              Spreadsheet Grid
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
              Vercel / GitHub
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
