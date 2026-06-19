import React, { useState, useEffect, useContext } from 'react';
import { User, BookOpen, LogOut, FileText, Clock, ChevronRight, GraduationCap, CheckCircle2, Award, Hourglass, RefreshCw, Play } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const { user, token, logout } = useContext(AuthContext);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.email) {
      fetchStudentTests();
    }
  }, [user]);

  const fetchStudentTests = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/classes/student/${user.email}/tests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTests(data);
      }
    } catch (error) {
      console.error("Failed to fetch tests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeTest = (testId) => {
    navigate(`/test/${testId}`);
  };

  // Helper to check if a test was left in progress (Session saved in LocalStorage)
  const isTestOngoing = (testId) => {
    if (!user || !user.email) return false;
    const sessionKey = `cbt_session_${testId}_${user.email}`;
    const savedSession = JSON.parse(localStorage.getItem(sessionKey) || '{}');
    // If the session has an endTime and it hasn't expired yet, it's ongoing
    return savedSession.endTime && savedSession.endTime > Date.now();
  };

  // --- ARRAY SPLITTING ---
  const activeTests = tests.filter(t => !t.is_submitted);
  const completedTests = tests.filter(t => t.is_submitted);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 text-left">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20 relative">
        <div className="flex items-center gap-3 z-10">
          <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-sm"><User size={22} /></div>
          <div>
            <h1 className="text-xl font-black text-slate-900 m-0">Student Portal</h1>
          </div>
        </div>

        {/* --- THE BRAND BANNER --- */}
        <div className="absolute left-1/2 transform -translate-x-1/2 hidden md:block">
          <img src="/banner.jpg" alt="Excelrs EVAL" className="h-10 w-auto object-contain" />
        </div>

        <button onClick={logout} className="flex items-center gap-2 text-sm font-bold text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors z-10">
          <LogOut size={16} /> Sign Out
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-12 mt-4 text-left">
        
        {/* =========================================
            SECTION 1: PENDING/ACTIVE ASSESSMENTS
        ========================================= */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2 m-0">
              <FileText size={24} className="text-emerald-500" />
              To-Do Assessments ({activeTests.length})
            </h2>
          </div>

          {loading ? (
            <p className="text-center font-bold text-slate-400 py-12">Loading your assessments...</p>
          ) : activeTests.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-200 text-center max-w-2xl mx-auto py-12">
               <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={36} />
                </div>
               <h2 className="text-xl font-black text-slate-900 mb-2 m-0">You're all caught up!</h2>
               <p className="text-sm font-bold text-slate-500 mt-1 m-0">You have no active tests assigned to your account right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeTests.map((test) => {
                // FEATURE 2: Ongoing Check
                const ongoing = isTestOngoing(test.id);
                // FEATURE 1: Attempts Remaining Calculation
                // Fallbacks to 1 attempt and 0 used if the backend didn't send them yet
                const maxAttempts = test.max_attempts || 1; 
                const attemptsUsed = test.attempts_used || 0;
                const attemptsRemaining = maxAttempts - attemptsUsed;

                return (
                  <div key={test.id} className={`bg-white rounded-2xl p-6 shadow-sm border-2 transition-all flex flex-col justify-between ${ongoing ? 'border-amber-300 ring-4 ring-amber-50' : 'border-slate-200 hover:border-emerald-500 group'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-2.5 py-1 rounded-md">
                          {test.class_name}
                        </span>
                        
                        <div className="flex gap-2">
                          {/* FEATURE 2: ONGOING INDICATOR */}
                          {ongoing && (
                            <div className="bg-amber-100 text-amber-700 text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse border border-amber-300">
                              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                              IN PROGRESS
                            </div>
                          )}
                          <span className="bg-slate-100 text-slate-700 text-xs font-black border border-slate-200 px-2 py-1 rounded-lg">
                            {test.total_points} pts
                          </span>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-black text-slate-900 mt-2 mb-4 line-clamp-1 m-0">{test.title}</h3>
                      
                      <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60 font-semibold">
                          <Clock size={16} className={ongoing ? "text-amber-500 shrink-0" : "text-amber-500 shrink-0"} />
                          Due: <span className={`font-bold ${ongoing ? "text-amber-600" : "text-slate-800"}`}>{new Date(test.due_date).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60 font-semibold">
                          <Hourglass size={16} className="text-blue-500 shrink-0" />
                          Time Allotted: <span className="font-bold text-slate-800">{test.duration || 60} minutes</span>
                        </div>
                        
                        {/* FEATURE 1: ATTEMPTS REMAINING */}
                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60 font-semibold">
                          <RefreshCw size={16} className={attemptsUsed > 0 ? 'text-amber-500 shrink-0' : 'text-emerald-500 shrink-0'} />
                          Attempts Remaining: 
                          <span className={`font-black px-2 py-0.5 rounded ml-1 ${attemptsUsed > 0 ? 'bg-amber-100 text-amber-700 border border-amber-200/50' : 'bg-emerald-100 text-emerald-700 border border-emerald-200/50'}`}>
                            {attemptsRemaining} of {maxAttempts}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleTakeTest(test.id)}
                      className={`w-full font-black py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
                        ongoing 
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200' 
                          : 'bg-slate-900 hover:bg-emerald-600 text-white group-hover:shadow-md'
                      }`}
                    >
                      {ongoing ? (
                        <>Resume Assessment <Play size={18} fill="currentColor" /></>
                      ) : (
                        <>Start Assessment <ChevronRight size={18} /></>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* =========================================
            SECTION 2: COMPLETED ASSESSMENTS
        ========================================= */}
        {completedTests.length > 0 && (
          <div className="space-y-6 pt-4 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h2 className="text-2xl font-black text-slate-400 flex items-center gap-2 m-0">
                <CheckCircle2 size={24} className="text-slate-400" />
                Completed Assessments ({completedTests.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {completedTests.map((test) => (
                <div key={test.id} className="bg-slate-100/80 border-2 border-slate-200 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-400 bg-slate-200/60 px-2.5 py-1 rounded-md">
                        {test.class_name}
                      </span>
                      
                      {/* Show finalized numeric score or pending review status */}
                      {test.score !== null ? (
                        <span className="bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-black px-2.5 py-1 rounded-md flex items-center gap-1">
                          <Award size={14} /> {test.score} / {test.total_points} pts
                        </span>
                      ) : (
                        <span className="bg-amber-100 border border-amber-200 text-amber-800 text-xs font-black px-2.5 py-1 rounded-md">
                          Pending Review
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-black text-slate-400 line-clamp-1 m-0 mt-2">{test.title}</h3>
                  </div>

                  <div className="w-full border-2 border-dashed border-slate-300 bg-slate-200/30 text-slate-400 font-black text-sm text-center py-3 rounded-xl mt-6">
                    Submission Finalized
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}