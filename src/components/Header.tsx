import React from 'react';
import { Copy, Check, FileCode2, Database, Zap, Flame } from 'lucide-react';

interface HeaderProps {
  activeTab: 'simulator' | 'code' | 'firebase' | 'advisor' | 'columns' | 'guide';
  setActiveTab: (tab: 'simulator' | 'code' | 'firebase' | 'advisor' | 'columns' | 'guide') => void;
  onCopyCode: () => void;
  copied: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onCopyCode,
  copied
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                GINZA FMS Studio
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-500">
                Google Sheets · Apps Script
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation tabs */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'simulator'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300'
              }`}
            >
              <span>📊 FMS Web Sheet (Google Sheet App)</span>
            </button>
            <button
              onClick={() => setActiveTab('firebase')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'firebase'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/70'
              }`}
            >
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
              <span>Firebase Cloud DB</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'code'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Apps Script Code
            </button>
            <button
              onClick={() => setActiveTab('advisor')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'advisor'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Big Data Architecture</span>
            </button>
            <button
              onClick={() => setActiveTab('columns')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'columns'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Column Matrix
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'guide'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Setup Guide
            </button>
          </nav>

          {/* Zone 3: Primary action button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onCopyCode}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 shadow-xs ${
                copied
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-emerald-700 text-white hover:bg-emerald-800'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied Script!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy GINZA Script
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile secondary nav strip */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none text-xs">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-2.5 py-1 rounded whitespace-nowrap font-bold ${activeTab === 'simulator' ? 'bg-emerald-700 text-white' : 'text-emerald-800 bg-emerald-50'}`}
          >
            📊 Web Sheet
          </button>
          <button
            onClick={() => setActiveTab('firebase')}
            className={`px-2.5 py-1 rounded whitespace-nowrap font-bold flex items-center gap-1 ${activeTab === 'firebase' ? 'bg-amber-600 text-white' : 'text-amber-800 bg-amber-50'}`}
          >
            <Flame className="w-3 h-3 fill-amber-500" />
            <span>Firebase</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'code' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600'}`}
          >
            Code
          </button>
          <button
            onClick={() => setActiveTab('advisor')}
            className={`px-2.5 py-1 rounded whitespace-nowrap font-medium ${activeTab === 'advisor' ? 'bg-emerald-700 text-white' : 'text-emerald-700 bg-emerald-50'}`}
          >
            Big Data
          </button>
          <button
            onClick={() => setActiveTab('columns')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'columns' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600'}`}
          >
            Columns
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'guide' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600'}`}
          >
            Guide
          </button>
        </div>
      </div>
    </header>
  );
};
