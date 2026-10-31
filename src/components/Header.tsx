import React, { useState } from 'react';
import {
  Copy,
  Check,
  FileCode2,
  Database,
  Flame,
  LogOut,
  Maximize2,
  Minimize2,
  Users,
  Radio,
  Plus,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Terminal,
  HelpCircle
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'simulator' | 'code' | 'firebase' | 'advisor' | 'columns' | 'guide';
  setActiveTab: (tab: 'simulator' | 'code' | 'firebase' | 'advisor' | 'columns' | 'guide') => void;
  onCopyCode: () => void;
  copied: boolean;
  isFullWidth: boolean;
  setIsFullWidth: (val: boolean) => void;
}

export interface ConnectedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  branch: string;
  status: 'active' | 'editing' | 'idle';
  activeCell: string;
  avatarColor: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onCopyCode,
  copied,
  isFullWidth,
  setIsFullWidth
}) => {
  // Current Logged-in Google User
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ginza_google_user_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      name: "MIS Mumbai",
      email: "mis.mumbai@ginzalimited.com",
      role: "Operations & FMS Lead",
      branch: "Mumbai Central",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80"
    };
  });

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showConnectedUsersModal, setShowConnectedUsersModal] = useState(false);
  const [showVercelFixModal, setShowVercelFixModal] = useState(false);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [copiedGitCmd, setCopiedGitCmd] = useState(false);

  // Live Connected Team Member IDs (Real-time presence)
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([
    {
      id: 'usr_1',
      name: 'MIS Mumbai (You)',
      email: 'mis.mumbai@ginzalimited.com',
      role: 'Operations & FMS Lead',
      branch: 'Mumbai Central',
      status: 'active',
      activeCell: 'Col AN (Status)',
      avatarColor: 'bg-emerald-600'
    },
    {
      id: 'usr_2',
      name: 'Lalit Maroo',
      email: 'lalit.maroo@ginzalimited.com',
      role: 'Sales Manager (Delhi)',
      branch: 'Delhi Branch',
      status: 'editing',
      activeCell: 'PO 5277 (Col S)',
      avatarColor: 'bg-blue-600'
    },
    {
      id: 'usr_3',
      name: 'Viren Shah',
      email: 'viren.shah@ginzalimited.com',
      role: 'Order Approval Authority',
      branch: 'HO Surat',
      status: 'active',
      activeCell: 'Col V (Approval)',
      avatarColor: 'bg-purple-600'
    },
    {
      id: 'usr_4',
      name: 'Anish Jain',
      email: 'anish.jain@ginzalimited.com',
      role: 'Logistics & Transporter Lead',
      branch: 'Delhi Hub',
      status: 'editing',
      activeCell: 'PO 5281 (Col AM LR#)',
      avatarColor: 'bg-amber-600'
    },
    {
      id: 'usr_5',
      name: 'Suresh Prasad',
      email: 'suresh.prasad@ginzalimited.com',
      role: 'Accounts & Dispatch Clearance',
      branch: 'Amritsar/Surat',
      status: 'idle',
      activeCell: 'Col Y (Dispatched)',
      avatarColor: 'bg-indigo-600'
    }
  ]);

  const handleAddConnectedUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInviteEmail.trim()) return;
    const namePart = newInviteEmail.split('@')[0].replace('.', ' ');
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

    const newUser: ConnectedUser = {
      id: `usr_${Date.now()}`,
      name: formattedName,
      email: newInviteEmail.trim().toLowerCase(),
      role: 'Sheet Viewer & Editor',
      branch: 'Connected Device',
      status: 'active',
      activeCell: 'Viewing Automation Grid',
      avatarColor: 'bg-teal-600'
    };

    setConnectedUsers(prev => [...prev, newUser]);
    setNewInviteEmail('');
  };

  const handleCopyGitCommand = () => {
    const cmd = `git add package.json .npmrc vercel.json\ngit commit -m "fix: resolve vercel esbuild peer dependency"\ngit push origin main`;
    navigator.clipboard.writeText(cmd).then(() => {
      setCopiedGitCmd(true);
      setTimeout(() => setCopiedGitCmd(false), 2500);
    });
  };

  return (
    <>
      {/* 1. MAIN HEADER NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className={`mx-auto transition-all ${isFullWidth ? 'px-3 sm:px-6' : 'max-w-7xl px-4 sm:px-6 lg:px-8'}`}>
          <div className="flex items-center justify-between gap-4 h-16">
            {/* Zone 1: Wordmark & Logo */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold shadow-xs">
                <FileCode2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                    GINZA FMS
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Vercel &amp; GitHub Ready
                  </span>
                </div>
                <span className="hidden sm:inline-block text-xs font-medium text-slate-500">
                  Product Order → Product Automation 
                </span>
              </div>
            </div>

            {/* Zone 2: Navigation tabs */}
            <nav className="hidden lg:flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('simulator')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'simulator'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300'
                }`}
              >
                <span>📊 FMS Web Sheet Grid</span>
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
                <span>Firebase Cloud Sync</span>
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
                Deploy &amp; Setup
              </button>
            </nav>

            {/* Zone 3: Google Login & Actions */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* GOOGLE SIGN IN / USER PROFILE */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="hidden md:block">
                    <span className="text-xs font-bold text-slate-800 block leading-tight">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-emerald-700 block leading-tight">
                      {currentUser.email}
                    </span>
                  </div>
                </button>

                {/* Profile Dropdown */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-xs space-y-2">
                    <div className="pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
                          {currentUser.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{currentUser.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono truncate">{currentUser.email}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100">
                        <span className="text-slate-500">Branch:</span>
                        <span className="font-semibold text-slate-800">{currentUser.branch}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowConnectedUsersModal(true)}
                      className="w-full text-left px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded font-medium flex items-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      <span>View All Connected IDs ({connectedUsers.length})</span>
                    </button>

                    <button
                      onClick={() => setShowVercelFixModal(true)}
                      className="w-full text-left px-2 py-1.5 text-xs text-amber-700 hover:bg-amber-50 rounded font-medium flex items-center gap-1.5"
                    >
                      <Terminal className="w-3.5 h-3.5 text-amber-600" />
                      <span>Vercel Build Fix Guide</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Copy Script CTA */}
              <button
                onClick={onCopyCode}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap shadow-xs ${
                  copied
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-emerald-700 text-white hover:bg-emerald-800'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Script</span>
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
              onClick={() => setActiveTab('columns')}
              className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'columns' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600'}`}
            >
              Columns
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'guide' ? 'bg-slate-900 text-white font-medium' : 'text-slate-600'}`}
            >
              Deploy
            </button>
          </div>
        </div>
      </header>

      {/* MODAL: LIVE CONNECTED USERS LIST & INVITE */}
      {showConnectedUsersModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 text-slate-900 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Live Connected Team Members ({connectedUsers.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real-time active Google IDs syncing with Ginza FMS Cloud
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConnectedUsersModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* List of Connected Users */}
            <div className="space-y-2">
              {connectedUsers.map(u => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${u.avatarColor} text-white flex items-center justify-center font-bold text-xs`}>
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">{u.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold">
                          {u.branch}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {u.status === 'editing' ? 'Live Editing' : 'Online'}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                      {u.activeCell}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add / Invite Google ID form */}
            <form onSubmit={handleAddConnectedUser} className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Add Team Colleague's Google Account ID:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={newInviteEmail}
                  onChange={e => setNewInviteEmail(e.target.value)}
                  placeholder="e.g. colleague@ginzalimited.com"
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap shadow-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect ID</span>
                </button>
              </div>
            </form>

            <div className="bg-slate-100 p-3 rounded-xl text-xs text-slate-600 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                All connected IDs receive real-time updates when Column Y (Dispatched), Column AM (LR#), or Column AN (Status) are edited.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VERCEL ERESOLVE BUILD FIX DETAILS */}
      {showVercelFixModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 text-slate-900 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Vercel Build Error Fix Applied!
                  </h3>
                  <p className="text-xs text-slate-500">
                    Solving: <code className="text-rose-600 font-mono text-[11px]">ERESOLVE esbuild@0.25 vs vite@8.3</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVercelFixModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Why the error happened */}
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-900 space-y-1">
              <span className="font-bold block">Kyun aaya yeh error Vercel par?</span>
              <p>
                Aapke Vercel build log me:
                <br />
                <code className="bg-rose-100 px-1 py-0.5 rounded text-[11px] font-mono">
                  Could not resolve dependency: peerOptional esbuild@"^0.27.0 || ^0.28.0" from vite@8.3.5
                </code>
              </p>
              <p>
                Vercel ka default npm strict peer dependency check karta hai. Root devDependencies me purana <code>esbuild 0.25</code> tha jabki Vite 8 ko esbuild 0.27+ chahiye.
              </p>
            </div>

            {/* Solution we applied */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Hamne Codebase me Yeh 3 Fixes Kar Diye Hain:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="font-bold text-emerald-900 block">1. package.json</span>
                  <span className="text-[11px] text-emerald-700">Conflicting esbuild devDependency hata di gayi</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="font-bold text-emerald-900 block">2. .npmrc</span>
                  <span className="text-[11px] text-emerald-700"><code>legacy-peer-deps=true</code> add kiya gaya</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="font-bold text-emerald-900 block">3. vercel.json</span>
                  <span className="text-[11px] text-emerald-700">Vite build &amp; dist directory lock kar di</span>
                </div>
              </div>
            </div>

            {/* What user needs to run */}
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono text-[11px]">
                  Apne terminal par yeh 3 lines run karein aur push karein:
                </span>
                <button
                  onClick={handleCopyGitCommand}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  {copiedGitCmd ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedGitCmd ? 'Copied Command!' : 'Copy Git Commands'}</span>
                </button>
              </div>
              <pre className="font-mono text-emerald-400 text-xs overflow-x-auto p-2 bg-slate-950 rounded">
                git add package.json .npmrc vercel.json
                <br />
                git commit -m "fix: resolve vercel esbuild peer dependency"
                <br />
                git push origin main
              </pre>
            </div>

            <p className="text-xs text-slate-500">
              Iske baad Vercel par automatically new deployment trigger ho jayega aur bina kisi error ke successfully compile hoke live ho jayega!
            </p>
          </div>
        </div>
      )}
    </>
  );
};
