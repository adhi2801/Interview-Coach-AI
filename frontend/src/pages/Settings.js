import { ArrowLeft, LogOut, User, Mail, Activity } from "lucide-react";

/**
 * Settings — minimal first version. Account info (read-only for now) + logout.
 * Deliberately small scope: no editable fields, no theme toggle, no
 * notification preferences yet — those were never designed, and shipping
 * a page that LOOKS like it has working settings but silently does nothing
 * would be worse than this honest, small version.
 */
export default function Settings({ user, onLogout, onGoBack }) {
  const firstName = user?.name
    ? user.name.split(" ")[0].charAt(0).toUpperCase() + user.name.split(" ")[0].slice(1)
    : "Guest";

  return (
    <div className="min-h-screen bg-black text-slate-200 font-sans">
      <header className="h-14 border-b border-white/[0.06] bg-black/80 backdrop-blur-md flex items-center px-8">
        <button
          onClick={onGoBack}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Dashboard
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-8 py-16">
        <h1 className="text-3xl font-extrabold tracking-tighter text-white mb-2">Settings</h1>
        <p className="text-sm text-slate-500 mb-10">Account details for {firstName}.</p>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden mb-6">
          <div className="flex items-center gap-4 px-6 py-5 border-b border-white/[0.06]">
            <User size={16} className="text-slate-500 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Name</p>
              <p className="text-sm font-semibold text-white">{user?.name || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-6 py-5 border-b border-white/[0.06]">
            <Mail size={16} className="text-slate-500 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Email</p>
              <p className="text-sm font-semibold text-white">{user?.email || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-6 py-5">
            <Activity size={16} className="text-slate-500 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Current Rating</p>
              <p className="text-sm font-semibold text-white tabular-nums">{Math.round(user?.elo_rating || 1200)}</p>
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={16} /> Log Out
        </button>
      </main>
    </div>
  );
}