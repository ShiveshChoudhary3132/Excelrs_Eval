import React, { useState, useEffect, useContext } from 'react';
import { 
  Plus, UserPlus, FileText, ClipboardList, BookOpen, Users, 
  LogOut, LayoutDashboard, Send, X, PlusCircle, Trash2, CheckCircle2, Circle,
  ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function TeacherDashboard() {
  const { token, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('classrooms');

  // --- CLASSROOM STATE ---
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [newClassName, setNewClassName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  
  // --- TEST STATE ---
  const [testTitle, setTestTitle] = useState('');
  const [testDueDate, setTestDueDate] = useState('');
  const [testDuration, setTestDuration] = useState(60); 
  const [questions, setQuestions] = useState([]); 
  const [classTests, setClassTests] = useState([]); 
  const [expandedTestId, setExpandedTestId] = useState(null);
  const [testAttempts, setTestAttempts] = useState(1);

  // --- AI GENERATION STATE ---
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- GRADING STATE ---
  const [testSubmissions, setTestSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [gradeInput, setGradeInput] = useState('');
  const [isAIGrading, setIsAIGrading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');

  const totalPoints = questions.reduce((sum, q) => sum + (parseInt(q.points) || 0), 0);

  useEffect(() => {
    if (token) fetchClasses();
  }, [token]);

  // --- DATA FETCHING ---
  const fetchClasses = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/classes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setClasses(data);
        
        if (selectedClass) {
          const updatedSelected = data.find(c => c.id === selectedClass.id);
          if (updatedSelected) setSelectedClass(updatedSelected);
        }
      }
    } catch (error) { console.error("Failed to fetch classes:", error); }
  };

  const fetchClassTests = async (classId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/classes/${classId}/tests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setClassTests(await response.json());
      }
    } catch (error) { console.error(error); }
  };

  const fetchSubmissions = async (testId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/classes/tests/${testId}/submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setTestSubmissions(await response.json());
        setSelectedSubmission(null);
        setAiFeedback('');
      }
    } catch (error) { console.error(error); }
  };

  // --- HANDLERS ---
  const handleSelectClass = (c) => {
    setSelectedClass(c);
    setTestSubmissions([]);
    setSelectedSubmission(null);
    setExpandedTestId(null);
    fetchClassTests(c.id); 
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    try {
      const response = await fetch('http://127.0.0.1:8000/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ class_name: newClassName })
      });
      if (response.ok) {
        setNewClassName('');
        fetchClasses();
      }
    } catch (error) { console.error(error); }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!studentEmail.trim() || !selectedClass) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/classes/${selectedClass.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email: studentEmail })
      });
      if (response.ok) {
        setStudentEmail('');
        fetchClasses(); 
      } else {
        const errorData = await response.json();
        alert(errorData.detail || "Failed to add student.");
      }
    } catch (error) { console.error(error); }
  };

  const handleRemoveStudent = async (emailToRemove) => {
    if (!window.confirm(`Remove ${emailToRemove}?`)) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/classes/${selectedClass.id}/students/${emailToRemove}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) fetchClasses();
    } catch (error) { console.error(error); }
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm("Are you sure you want to delete this test?")) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/classes/tests/${testId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchClassTests(selectedClass.id);
        setExpandedTestId(null);
      }
    } catch (error) { console.error(error); }
  };

  // --- AI GENERATION HANDLER ---
  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) { alert("Please enter a topic and difficulty first!"); return; }
    
    setIsGenerating(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/classes/ai/generate-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ topic: aiTopic, question_count: parseInt(aiCount) })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Append the new questions to the bottom of the existing list!
        setQuestions([...questions, ...data.questions]); 
        
        alert(`Success! Added ${data.questions.length} new questions to the bottom of your test.`);
        
        // Optional: clear the input box so you can type the next topic easily
        setAiTopic(''); 
      } else {
        alert("AI generation failed. Check backend console.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGrantRetake = async () => {
    if (!window.confirm(`Are you sure you want to delete this attempt for ${selectedSubmission.student_email}? This cannot be undone.`)) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/classes/submissions/${selectedSubmission.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        alert("Attempt deleted. The student has been granted a retake.");
        setSelectedSubmission(null);
        fetchSubmissions(selectedSubmission.test_id); 
      }
    } catch (err) { console.error(err); }
  };

  // --- TEST BUILDER HANDLERS ---
  const addQuestion = () => {
    setQuestions([...questions, {
      id: Date.now().toString(), type: 'mcq', text: '', points: 10,
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'], correctAnswerIndex: 0
    }]);
  };

  const updateQuestion = (id, field, value) => setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  const updateOption = (qId, optIndex, value) => setQuestions(questions.map(q => q.id === qId ? { ...q, options: q.options.map((o, i) => i === optIndex ? value : o) } : q));
  const setCorrectAnswer = (qId, optIndex) => setQuestions(questions.map(q => q.id === qId ? { ...q, correctAnswerIndex: optIndex } : q));
  const removeQuestion = (id) => setQuestions(questions.filter(q => q.id !== id));

  const handleAssignTest = async (e) => {
    e.preventDefault();
    if (!testTitle.trim() || !testDueDate || !selectedClass) return;
    if (questions.length === 0) { alert("Please add at least one question."); return; }
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/classes/${selectedClass.id}/tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          title: testTitle, 
          due_date: testDueDate, 
          duration: parseInt(testDuration), 
          max_attempts: parseInt(testAttempts),
          total_points: totalPoints,            
          questions: questions 
        })
      });

      if (response.ok) {
        alert(`Success! "${testTitle}" is now live.`);
        setTestTitle(''); setTestDueDate(''); setTestDuration(60); setTestAttempts(1); setQuestions([]);
        setActiveTab('classrooms'); 
        fetchClassTests(selectedClass.id);
      }
    } catch (error) { console.error(error); alert("Network error."); }
  };

  const handleAIGrade = async () => {
    setIsAIGrading(true);
    setAiFeedback('');
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/classes/submissions/${selectedSubmission.id}/ai-grade`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGradeInput(data.suggested_score.toString()); 
        setAiFeedback(data.feedback);
      } else {
        alert("AI Grading failed. Please check the backend console.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAIGrading(false);
    }
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/classes/submissions/${selectedSubmission.id}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ score: parseInt(gradeInput) })
      });
      if (response.ok) {
        alert("Grade saved successfully!");
        setSelectedSubmission(null);
        fetchSubmissions(selectedSubmission.test_id); 
      }
    } catch (error) { console.error(error); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 text-left">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20 relative">
        <div className="flex items-center gap-3 z-10">
          <div className="bg-blue-600 text-white p-2 rounded-xl shadow-sm"><BookOpen size={22} /></div>
          <div>
            <h1 className="text-xl font-black text-slate-900 m-0">Instructor Portal</h1>
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

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        
        {/* TABS */}
        <div className="flex p-1.5 bg-slate-200/60 rounded-2xl w-full max-w-2xl mx-auto shadow-inner border border-slate-300">
          <button onClick={() => setActiveTab('classrooms')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'classrooms' ? 'bg-white text-blue-700 shadow-md border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}><LayoutDashboard size={18} /> Classrooms</button>
          <button onClick={() => setActiveTab('tests')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'tests' ? 'bg-white text-violet-700 shadow-md border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}><FileText size={18} /> Publish Test</button>
          <button onClick={() => setActiveTab('grading')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'grading' ? 'bg-white text-emerald-700 shadow-md border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}><CheckCircle2 size={18} /> Grade Submissions</button>
        </div>

        {selectedClass && (
          <div className="bg-white border-2 border-slate-200 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-sm">
            <span className="flex h-4 w-4 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-blue-600"></span></span>
            <p className="text-base text-slate-600 font-bold m-0">Active Workspace: <strong className="text-slate-900">{selectedClass.class_name}</strong></p>
          </div>
        )}

        {/* VIEW 1: CLASSROOMS */}
        {activeTab === 'classrooms' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-300">
                  <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2"><Plus size={18} className="text-blue-600" /> Create New Class</h3>
                  <form onSubmit={handleCreateClass} className="space-y-3">
                    <input type="text" required placeholder="e.g., Grade 10 Geometry" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-blue-500 font-semibold" />
                    <button type="submit" className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black py-3 px-4 rounded-xl transition-colors">Build Classroom</button>
                  </form>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-300">
                  <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2"><ClipboardList size={18} className="text-blue-600" /> Your Classrooms</h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {classes.map((c) => (
                      <button key={c.id} onClick={() => handleSelectClass(c)} className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${selectedClass?.id === c.id ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm' : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'}`}>
                        <div>
                          <p className="font-black text-base m-0">{c.class_name}</p>
                          <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1.5 m-0"><Users size={14} /> {c.students?.length || 0} Students</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
             </div>

             <div className="lg:col-span-2">
                {!selectedClass ? (
                  <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-300 h-full flex flex-col items-center justify-center text-center"><LayoutDashboard size={48} className="text-slate-300 mb-4" /><h2 className="text-2xl font-black text-slate-900 m-0">No Workspace Selected</h2></div>
                ) : (
                  <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-300 h-full flex flex-col">
                    
                    <div className="mb-6 border-b-2 border-slate-100 pb-8">
                      <h2 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2 m-0"><UserPlus size={22} className="text-blue-600" /> Add students</h2>
                      <form onSubmit={handleAddStudent} className="flex gap-3 mt-4">
                        <input type="email" required placeholder="student@school.com" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-blue-500 font-semibold" />
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-6 rounded-xl flex items-center gap-2 transition-colors"><Plus size={18} /> Add</button>
                      </form>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2 m-0"><Users size={18} /> Enrolled Students ({selectedClass.students?.length || 0})</h3>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 m-0 p-0 max-h-[300px] overflow-y-auto">
                        {selectedClass.students?.map((studentObj, idx) => {
                          const email = typeof studentObj === 'string' ? studentObj : studentObj.email;
                          const name = typeof studentObj === 'string' 
                            ? email.split('@')[0].split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                            : studentObj.name;

                          return (
                            <li key={idx} className="bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between group">
                              <div className="flex flex-col truncate pr-2">
                                <span className="font-black text-slate-800 truncate">{name}</span>
                                <span className="text-xs font-bold text-slate-400 truncate">{email}</span>
                              </div>
                              <button onClick={() => handleRemoveStudent(email)} className="text-slate-400 hover:text-red-600 bg-white p-2 rounded-lg border-2 border-slate-200 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"><X size={16} /></button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>

                    <div className="mt-8 border-t-2 border-slate-100 pt-8">
                      <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2 m-0"><FileText size={18} /> Published Assessments ({classTests.length})</h3>
                      {classTests.length === 0 ? (
                         <div className="text-center py-10 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 font-bold text-slate-400">No tests published yet.</div>
                      ) : (
                        <div className="space-y-4">
                          {classTests.map(test => (
                            <div key={test.id} className="border-2 border-slate-200 rounded-xl overflow-hidden bg-white">
                              <div className="flex items-center justify-between p-4 bg-slate-50">
                                <div className="flex-1 cursor-pointer" onClick={() => setExpandedTestId(expandedTestId === test.id ? null : test.id)}>
                                  <h4 className="font-black text-slate-800 text-lg m-0 flex items-center gap-2">
                                    {test.title} 
                                    {expandedTestId === test.id ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}
                                  </h4>
                                  <p className="text-xs font-bold text-slate-500 m-0 mt-1">
                                    Due: {new Date(test.due_date).toLocaleString()} | {test.duration || 60} Mins | {test.total_points} Points
                                  </p>
                                </div>
                                <button onClick={() => handleDeleteTest(test.id)} className="p-2.5 bg-white border-2 border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors shadow-sm ml-4"><Trash2 size={18} /></button>
                              </div>

                              {expandedTestId === test.id && (
                                <div className="p-6 border-t-2 border-slate-100 space-y-6 bg-white">
                                  {test.questions?.map((q, idx) => (
                                    <div key={idx} className="space-y-3">
                                      <p className="font-black text-slate-800 m-0 flex gap-2"><span className="text-blue-600">Q{idx + 1}.</span> {q.text} <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md ml-auto h-fit">{q.points} pts</span></p>
                                      {q.type === 'mcq' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                                          {q.options.map((opt, optIdx) => (
                                            <div key={optIdx} className={`p-2 rounded-lg text-sm font-bold border-2 ${q.correctAnswerIndex === optIdx ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                              {opt} {q.correctAnswerIndex === optIdx && <span className="ml-2 text-emerald-600 text-xs uppercase tracking-widest">(Correct)</span>}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {q.type === 'essay' && (<div className="pl-6"><div className="p-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg text-sm font-bold text-slate-400">[ Written Essay Response Expected ]</div></div>)}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
             </div>
           </div>
        )}

        {/* VIEW 2: PUBLISH TEST */}
        {activeTab === 'tests' && (
          <div className="pb-12">
            {!selectedClass ? (
               <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-300 text-center max-w-2xl mx-auto"><FileText size={48} className="text-violet-300 mx-auto mb-4" /><h2 className="text-2xl font-black text-slate-900 m-0">Select a Target Audience</h2></div>
            ) : (
              <form onSubmit={handleAssignTest} className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-300 border-t-8 border-t-violet-600">
                  <h2 className="text-2xl font-black text-slate-900 mb-6 m-0">Assessment Configuration</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Assessment Title</label>
                      <input type="text" required placeholder="e.g., Midterm Examination" value={testTitle} onChange={(e) => setTestTitle(e.target.value)} className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-violet-500 text-lg font-black outline-none" />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Submission Deadline</label>
                        <input type="datetime-local" required value={testDueDate} onChange={(e) => setTestDueDate(e.target.value)} className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-violet-500 font-bold outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Duration (Mins)</label>
                        <div className="relative">
                          <Clock size={18} className="absolute left-3 top-3.5 text-slate-400" />
                          <input type="number" required min="1" value={testDuration} onChange={(e) => setTestDuration(e.target.value)} className="w-full pl-10 pr-4 py-3 border-2 border-slate-300 rounded-xl focus:border-violet-500 font-bold outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Max Attempts</label>
                        <input type="number" required min="1" max="10" value={testAttempts} onChange={(e) => setTestAttempts(e.target.value)} className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-violet-500 font-bold outline-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- AI TEST GENERATOR PANEL --- */}
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-8 shadow-sm">
                  <h3 className="text-xl font-black text-emerald-900 mb-4 flex items-center gap-2 m-0">
                    ✨ Generate with Excelrs Eval AI
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input 
                      type="text" 
                      placeholder="e.g., The architecture of EVM vs PoW networks..." 
                      value={aiTopic} 
                      onChange={(e) => setAiTopic(e.target.value)} 
                      className="flex-1 px-4 py-3 border-2 border-emerald-200 rounded-xl focus:border-emerald-500 outline-none font-bold text-slate-700" 
                    />
                    <div className="flex items-center gap-3 bg-white px-4 py-2 border-2 border-emerald-200 rounded-xl">
                      <label className="text-xs font-black text-emerald-700 uppercase tracking-widest">Qty:</label>
                      <input 
                        type="number" 
                        min="1" max="20" 
                        value={aiCount} 
                        onChange={(e) => setAiCount(e.target.value)} 
                        className="w-16 outline-none font-black text-center text-slate-800" 
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={handleGenerateAI}
                      disabled={isGenerating}
                      className={`font-black py-3 px-6 rounded-xl transition-all shadow-sm ${isGenerating ? 'bg-emerald-200 text-emerald-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                    >
                      {isGenerating ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                </div>
                {/* --------------------------------- */}

                <div className="space-y-6">
                  {questions.map((q, index) => (
                    <div key={q.id} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-300 flex flex-col gap-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                          <span className="bg-slate-800 text-white px-4 py-1.5 rounded-lg text-sm font-black tracking-widest">Q{index + 1}</span>
                          <select value={q.type} onChange={(e) => updateQuestion(q.id, 'type', e.target.value)} className="bg-slate-50 border-2 border-slate-200 font-bold rounded-lg px-4 py-2 outline-none focus:border-blue-500 cursor-pointer">
                            <option value="mcq">Multiple Choice</option>
                            <option value="essay">Written Essay</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Points:</label>
                            <input type="number" min="1" value={q.points} onChange={(e) => updateQuestion(q.id, 'points', parseInt(e.target.value) || 0)} className="w-20 px-3 py-2 border-2 border-slate-300 rounded-lg font-black text-center outline-none focus:border-blue-500" />
                          </div>
                          <button type="button" onClick={() => removeQuestion(q.id)} className="text-slate-400 hover:text-red-600 bg-slate-50 border-2 border-slate-200 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
                        </div>
                      </div>
                      <textarea required placeholder="Type your question here..." value={q.text} onChange={(e) => updateQuestion(q.id, 'text', e.target.value)} className="w-full px-5 py-4 border-2 border-slate-300 rounded-xl focus:border-blue-500 text-lg font-semibold resize-none outline-none" rows="2" />
                      {q.type === 'mcq' && (
                        <div className="space-y-3">
                          {q.options.map((opt, optIndex) => {
                            const isCorrect = q.correctAnswerIndex === optIndex;
                            return (
                              <div key={optIndex} className={`flex items-center gap-4 p-3 rounded-xl border-2 transition-all ${isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                                <button type="button" onClick={() => setCorrectAnswer(q.id, optIndex)} className="focus:outline-none flex-shrink-0">
                                  {isCorrect ? <CheckCircle2 size={28} className="text-emerald-500" /> : <Circle size={28} className="text-slate-300 hover:text-emerald-400" />}
                                </button>
                                <input type="text" required placeholder={`Option ${optIndex + 1}`} value={opt} onChange={(e) => updateOption(q.id, optIndex, e.target.value)} className={`flex-1 px-4 py-3 border-2 rounded-xl text-base font-bold outline-none transition-colors ${isCorrect ? 'border-emerald-400 bg-white text-emerald-900' : 'border-slate-200 focus:border-blue-400'}`} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm">
                  <span className="font-black text-slate-500 uppercase tracking-widest text-sm">Total Assessment Value:</span>
                  <span className="text-2xl font-black text-slate-800 bg-slate-100 px-4 py-2 rounded-xl border-2 border-slate-200">{totalPoints} Points</span>
                </div>

                <button type="button" onClick={addQuestion} className="w-full border-4 border-dashed border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-400 font-black text-lg py-5 rounded-2xl flex items-center justify-center gap-2"><PlusCircle size={24} /> Add Question</button>
                <div className="pt-6"><button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white text-xl font-black py-5 rounded-2xl shadow-lg flex items-center justify-center gap-3"><Send size={24} /> Publish Test</button></div>
              </form>
            )}
          </div>
        )}

        {/* VIEW 3: GRADING DASHBOARD */}
        {activeTab === 'grading' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              {!selectedClass ? (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-300 text-center font-bold text-slate-500">Select a classroom from the "Classrooms" tab first.</div>
              ) : (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-300">
                  <h3 className="text-lg font-black text-slate-900 mb-4 m-0">Tests in {selectedClass.class_name}</h3>
                  <div className="space-y-2">
                    {classTests.length === 0 && <p className="text-sm font-bold text-slate-400 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">No tests published yet.</p>}
                    {classTests.map(test => (
                      <button key={test.id} onClick={() => fetchSubmissions(test.id)} className="w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 font-bold text-slate-700 shadow-sm">
                        {test.title}
                      </button>
                    ))}
                  </div>

                  {testSubmissions.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 m-0">Student Submissions</h3>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {testSubmissions.map(sub => (
                          <button key={sub.id} onClick={() => { setSelectedSubmission(sub); setGradeInput(sub.score || ''); }} className={`w-full flex justify-between items-center p-4 rounded-xl border-2 transition-all ${selectedSubmission?.id === sub.id ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600' : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'}`}>
                            <span className="font-black text-sm truncate">{sub.student_email}</span>
                            {sub.score !== null ? <span className="bg-emerald-200 text-emerald-900 px-2 py-1.5 rounded-lg text-xs font-black">{sub.score} pts</span> : <span className="bg-amber-100 border-2 border-amber-300 text-amber-800 px-2 py-1.5 rounded-lg text-xs font-black">Review</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              {!selectedSubmission ? (
                <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-300 h-full flex flex-col items-center justify-center text-center"><CheckCircle2 size={48} className="text-emerald-200 mb-4" /><h2 className="text-2xl font-black text-slate-900 m-0">Grading Portal</h2><p className="text-slate-500 font-bold mt-2">Select a student submission from the left panel to review.</p></div>
              ) : (
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-300 h-[calc(100vh-200px)] flex flex-col">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-slate-100 pb-6 mb-6 shrink-0">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 m-0">{selectedSubmission.student_email}</h2>
                      <p className="text-sm text-slate-500 font-bold mt-1 m-0">
                        Submitted: {new Date(selectedSubmission.submitted_at + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                    
                    {/* --- NEW: AI GRADING & RETAKE PANEL --- */}
                    <div className="flex flex-col gap-3 sm:items-end w-full sm:w-auto">
                      <div className="flex flex-wrap items-center gap-3">
                        <button 
                          type="button" 
                          onClick={handleGrantRetake} 
                          className="bg-red-50 hover:bg-red-100 text-red-600 font-black py-2.5 px-4 rounded-xl flex items-center gap-2 border-2 border-red-200 transition-colors shadow-sm"
                        >
                          <Trash2 size={16} /> Delete Attempt
                        </button>

                        <button 
                          type="button" 
                          onClick={handleAIGrade} 
                          disabled={isAIGrading} 
                          className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-black py-2.5 px-4 rounded-xl flex items-center gap-2 transition-colors border-2 border-emerald-300 disabled:opacity-50 shadow-sm"
                        >
                          ✨ {isAIGrading ? "Analyzing Answers..." : "Auto-Grade"}
                        </button>
                        
                        <form onSubmit={handleSaveGrade} className="flex items-center gap-3 bg-slate-50 p-2 pl-4 rounded-xl border-2 border-slate-200">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Final Score:</label>
                          <input type="number" required min="0" value={gradeInput} onChange={(e) => setGradeInput(e.target.value)} className="w-20 px-2 py-1.5 border-2 border-slate-300 rounded-lg font-black text-center text-lg outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20" />
                          <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white font-black py-2.5 px-5 rounded-lg transition-colors shadow-md text-sm">Save</button>
                        </form>
                      </div>

                      {/* Display the AI's logic directly beneath the score */}
                      {aiFeedback && (
                         <div className="bg-emerald-50 border-2 border-emerald-200 text-emerald-800 text-sm font-semibold p-4 rounded-xl max-w-md shadow-sm animate-in fade-in slide-in-from-top-2">
                            <span className="block text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">AI Evaluation Notes:</span>
                            {aiFeedback}
                         </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-4 space-y-6">
                    <h3 className="font-black text-slate-400 uppercase tracking-widest text-xs m-0">Student Responses</h3>
                    
                    {/* Map the answers back to the original questions! */}
                    {classTests.find(t => t.id === selectedSubmission.test_id)?.questions?.map((q, idx) => {
                      const studentAnswer = selectedSubmission.answers[idx.toString()];
                      const isCorrect = q.type === 'mcq' && studentAnswer == q.correctAnswerIndex;
                      
                      return (
                        <div key={idx} className={`p-5 border-2 rounded-2xl transition-all ${
                          isCorrect ? 'border-emerald-200 bg-emerald-50/50' : 
                          (q.type === 'mcq' && studentAnswer !== undefined ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-white')
                        }`}>
                           <p className="font-black text-slate-800 m-0 mb-3 flex gap-2">
                             <span className="text-blue-600">Q{idx + 1}.</span> {q.text}
                             <span className="ml-auto text-xs font-bold text-slate-400 bg-white border-2 border-slate-100 px-2 py-0.5 rounded-md">{q.points} pts</span>
                           </p>

                           <div className="text-sm font-bold">
                             {q.type === 'mcq' ? (
                               studentAnswer !== undefined ? (
                                 <div className="flex flex-col gap-1.5">
                                   <div className={`p-3 rounded-xl border-2 flex items-center justify-between ${isCorrect ? 'border-emerald-300 bg-emerald-100/50 text-emerald-800' : 'border-red-300 bg-red-100/50 text-red-800'}`}>
                                     <span>Student chose: <strong className="font-black">{q.options[parseInt(studentAnswer)]}</strong></span>
                                     {isCorrect ? <CheckCircle2 size={18} /> : <X size={18} />}
                                   </div>
                                   {!isCorrect && (
                                     <div className="p-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-600 mt-1 flex items-center gap-2">
                                       <span className="text-slate-400 uppercase tracking-widest text-[10px]">Correct Answer:</span>
                                       {q.options[q.correctAnswerIndex]}
                                     </div>
                                   )}
                                 </div>
                               ) : <span className="text-slate-400 italic p-3 border-2 border-dashed border-slate-200 rounded-xl block">No answer provided</span>
                             ) : (
                               <div className="bg-white p-4 border-2 border-slate-200 rounded-xl text-slate-700 whitespace-pre-wrap leading-relaxed shadow-sm">
                                 {studentAnswer || <span className="text-slate-400 italic">Student left this essay blank.</span>}
                               </div>
                             )}
                           </div>
                        </div>
                      )
                    })}

                    {/* Raw JSON Dump for Future AI */}
                    <div className="mt-12 pt-8 border-t-2 border-slate-200">
                      <h3 className="font-black text-slate-400 uppercase tracking-widest text-xs m-0 mb-4 flex items-center gap-2">
                        Raw API Data <span className="bg-slate-200 text-slate-500 px-2 py-0.5 rounded text-[10px]">For Future AI Processing</span>
                      </h3>
                      <pre className="bg-slate-900 text-slate-500 p-4 rounded-xl text-xs overflow-x-auto font-mono opacity-50 hover:opacity-100 transition-opacity cursor-crosshair border-2 border-slate-800 shadow-inner">
                        {JSON.stringify(selectedSubmission.answers, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}