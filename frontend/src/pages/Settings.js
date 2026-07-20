import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { ArrowLeft, LogOut, User, Mail, Activity, ShieldAlert, Key, Trash2 } from "lucide-react";

export default function Settings({ user, onLogout, onGoBack }) {
  const [mounted, setMounted] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const firstName = user?.name
    ? user.name.split(" ")[0].charAt(0).toUpperCase() + user.name.split(" ")[0].slice(1)
    : "Guest";

  const getGradient = (name) => {
    if (!name) return "linear-gradient(135deg, #3b82f6, #8b5cf6)";
    const charCode = name.charCodeAt(0) || 0;
    const colors = [
      "linear-gradient(135deg, #3b82f6, #8b5cf6)",
      "linear-gradient(135deg, #10b981, #3b82f6)",
      "linear-gradient(135deg, #f59e0b, #ef4444)",
      "linear-gradient(135deg, #ec4899, #8b5cf6)"
    ];
    return colors[charCode % colors.length];
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.delete(`${API_URL}/user/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.error) {
        setDeleteError(res.data.error);
        setDeleting(false);
      } else {
        // Account and all data are gone server-side — clear local state and log out
        onLogout();
      }
    } catch (err) {
      setDeleteError("Something went wrong. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative flex flex-col">
      
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/10 blur-[150px] pointer-events-none mix-blend-screen z-0" />
      
      <div 
        className="fixed inset-0 z-10 pointer-events-none opacity-[0.02] mix-blend-soft-light"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <header className="sticky top-0 z-50 h-14 border-b border-white/[0.06] bg-black/80 backdrop-blur-md flex items-center px-8 flex-shrink-0">
        <button
          onClick={onGoBack}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Return to Dashboard
        </button>
      </header>

      <main className="flex-1 w-full relative z-20 px-8 py-16">
        <div 
          className={`max-w-3xl transition-all duration-700 ease-out transform ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          
          <div className="flex items-center gap-6 mb-16">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-[0_0_30px_rgba(255,255,255,0.1)] border border-white/10"
              style={{ background: getGradient(user?.name) }}
            >
              {initial}
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tighter text-white mb-1">Account Settings</h1>
              <p className="text-sm font-medium text-slate-500">Managing configurations for {firstName}.</p>
            </div>
          </div>

          {/* B. THE DATA LEDGER (Deep Glass) */}
          <section className="mb-12">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <User size={14} /> Profile Information
            </h2>
            
            {/* FIXED: "Edit" / "Change" / "Update" were styled as real,
                clickable buttons but had no onClick and no backend endpoint
                to actually edit a user's name, email, or password exists
                (main.py has no PATCH /user route). They looked interactive
                and silently did nothing when clicked. Replaced with plain
                display rows — honest about what this page currently does:
                show info, not edit it. */}

            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
              
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.05]">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Legal Name</p>
                  <p className="text-sm font-semibold text-white">{user?.name || "—"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.05]">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Email Address</p>
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    {user?.email || "—"} 
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] uppercase tracking-widest font-bold">Verified</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between px-6 py-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Authentication</p>
                  <p className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                    <Key size={14} /> Password securely hashed
                  </p>
                </div>
              </div>

            </div>
          </section>

          <section className="mb-16">
             <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <Activity size={14} /> System Telemetry
            </h2>
            
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
              <div className="flex items-center justify-between px-6 py-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Current Rating</p>
                  <div className="flex items-center gap-3">
                     <span className="text-2xl font-bold text-white tabular-nums tracking-tighter leading-none">
                       {Math.round(user?.elo_rating || 1200)}
                     </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
             <h2 className="text-[11px] font-bold uppercase tracking-widest text-red-500 mb-4 flex items-center gap-2">
              <ShieldAlert size={14} /> Danger Zone
            </h2>
            
            <div className="bg-red-500/[0.02] border border-red-500/10 rounded-2xl overflow-hidden p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
               <div>
                 <p className="text-sm font-bold text-red-400 mb-1">End Current Session</p>
                 <p className="text-xs font-medium text-slate-500">Log out of your account on this device.</p>
               </div>
               
               <button
                 onClick={onLogout}
                 className="flex-shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/20 hover:border-red-500/30 active:scale-95 transition-all w-full sm:w-auto"
               >
                 <LogOut size={16} /> Log Out
               </button>
            </div>

            {/* Real delete-account flow — closes the "no deletion path for
                stored PII" gap. Every interview transcript, coding
                submission, and session record tied to this user is removed
                server-side via DELETE /user/me, not just the account row. */}
            <div className="bg-red-500/[0.02] border border-red-500/10 rounded-2xl overflow-hidden p-6 mt-4">
              {!confirmingDelete ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div>
                    <p className="text-sm font-bold text-red-400 mb-1">Delete Account</p>
                    <p className="text-xs font-medium text-slate-500">
                      Permanently deletes your account and every interview, coding submission,
                      and transcript associated with it. This cannot be undone.
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    className="flex-shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-red-500/20 text-red-400/70 text-sm font-bold hover:bg-red-500/10 hover:text-red-400 active:scale-95 transition-all w-full sm:w-auto"
                  >
                    <Trash2 size={16} /> Delete Account
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-red-400 mb-1">Are you sure?</p>
                  <p className="text-xs font-medium text-slate-500 mb-4">
                    This permanently deletes your account and all associated data. There is no undo.
                  </p>
                  {deleteError && (
                    <p className="text-xs font-medium text-red-400 mb-4">{deleteError}</p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setConfirmingDelete(false)}
                      disabled={deleting}
                      className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-slate-400 text-sm font-bold hover:bg-white/[0.03] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="flex-1 px-6 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {deleting ? "Deleting..." : "Yes, delete everything"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}