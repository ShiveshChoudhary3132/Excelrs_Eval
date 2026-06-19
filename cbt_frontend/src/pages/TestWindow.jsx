import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// THIS IS THE FIX: We import the real context instead of using a fake mock
import { AuthContext } from '../context/AuthContext'; 

import { 
  AlertTriangle, Clock, ShieldAlert, CheckCircle2, ShieldCheck, 
  Camera, CameraOff, LayoutGrid, Flag, Globe, Loader2, Edit3, Trash2, X, FileText
} from 'lucide-react';

const LANGUAGES = ['English', 'Hindi', 'Bengali', 'Marathi', 'Telugu', 'Tamil'];

export default function App() {
  const { testId } = useParams() || { testId: 'sample-test-id' };
  
  // Now this pulls your ACTUAL logged-in user details
  const { user, token } = useContext(AuthContext); 
  const navigate = useNavigate ? useNavigate() : () => {};

  // --- CORE STATE ---
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFinishing = useRef(false); 
  
  // --- TRANSLATION STATE ---
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedQuestions, setTranslatedQuestions] = useState(null);

  // --- PROCTORING STATE ---
  const [hasStarted, setHasStarted] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [securityLockout, setSecurityLockout] = useState(null); 
  const MAX_WARNINGS = 3;
  const [timeLeft, setTimeLeft] = useState(3600);

  // --- AI WEBCAM STATE ---
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [faceModel, setFaceModel] = useState(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const lastWarningTime = useRef(0);
  const missingFaceStart = useRef(null);
  const multipleFaceStart = useRef(null);

  // --- DIGITAL SCRATCHPAD STATE ---
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [scratchpadMode, setScratchpadMode] = useState('notes'); 
  const [scratchpadText, setScratchpadText] = useState('');
  
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#1e293b'); 
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const savedCanvasImageRef = useRef(null);

  // 1. NATIVE CAMERA INITIALIZATION 
  useEffect(() => {
    let activeStream = null;
    const initCamera = async () => {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setStream(activeStream);
        setCameraEnabled(true);
        setCameraError("");
      } catch (err) {
        setCameraEnabled(false);
        setCameraError("Camera access denied. Please click 'Allow' in your browser URL bar.");
      }
    };
    initCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 2. BIND STREAM TO VIDEO ELEMENT
  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, hasStarted]); 

  // 3. DYNAMICALLY LOAD GOOGLE TENSORFLOW AI
  useEffect(() => {
    let isMounted = true;
    const loadAI = async () => {
      try {
        if (!window.tf) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js";
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        if (!window.blazeface) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.0.7/dist/blazeface.min.js";
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        if (window.blazeface) {
          const model = await window.blazeface.load();
          if (isMounted) {
            setFaceModel(model);
            setIsModelLoaded(true);
          }
        }
      } catch (err) {
        console.warn("AI Model failed to load from CDN. Proceeding without AI.", err);
        if (isMounted) setIsModelLoaded(true); 
      }
    };
    loadAI();
    return () => { isMounted = false; };
  }, []);

  // Load Mock/Real Test & Check for Saved Session
  useEffect(() => {
    const fetchTest = async () => {
      try {
        const response = await fetch(`https://excelrs-backend.onrender.com/api/classes/tests/${testId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let testData;
        if (response.ok) {
          testData = await response.json();
        } else {
          testData = {
            title: "Advanced Data Structures & Algorithms",
            duration: 45,
            questions: [
              { text: "Which data structure operates on a Last-In, First-Out (LIFO) basis?", type: "mcq", points: 4, options: ["Queue", "Stack", "Linked List", "Binary Search Tree"] },
              { text: "Explain the main differences between Merge Sort and Quick Sort algorithms.", type: "essay", points: 10 },
              { text: "What is the time complexity of searching for an element in a balanced BST?", type: "mcq", points: 4, options: ["O(1)", "O(N)", "O(log N)", "O(N log N)"] }
            ]
          };
        }

        setTest(testData);

        // Session Resume Logic
        if (user && user.email) {
          const sessionKey = `cbt_session_${testId}_${user.email}`;
          const savedSession = JSON.parse(localStorage.getItem(sessionKey) || '{}');
          
          if (savedSession.answers) {
            setAnswers(savedSession.answers);
          }
          
          if (savedSession.endTime) {
            const remaining = Math.floor((savedSession.endTime - Date.now()) / 1000);
            setTimeLeft(remaining > 0 ? remaining : 0);
          } else {
            setTimeLeft((testData.duration || 60) * 60);
          }
        } else {
          setTimeLeft((testData.duration || 60) * 60);
        }

      } catch (error) { 
        console.error(error); 
      } finally { 
        setLoading(false); 
      }
    };
    
    if (token) {
      fetchTest();
    }
  }, [testId, token, user]);

  // --- SCRATCHPAD LOGIC ---
  useEffect(() => {
    if (scratchpadMode === 'sketch' && isScratchpadOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const context = canvas.getContext('2d');
      context.scale(2, 2);
      context.lineCap = 'round';
      context.strokeStyle = isEraser ? '#ffffff' : brushColor;
      context.lineWidth = brushSize;
      contextRef.current = context;

      if (savedCanvasImageRef.current) {
        const img = new Image();
        img.onload = () => context.drawImage(img, 0, 0, rect.width, rect.height);
        img.src = savedCanvasImageRef.current;
      }
    }
  }, [scratchpadMode, isScratchpadOpen]);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = isEraser ? '#ffffff' : brushColor;
      contextRef.current.lineWidth = brushSize;
    }
  }, [brushColor, brushSize, isEraser]);

  const startDrawing = (e) => {
    const nativeEvent = e.nativeEvent;
    if (nativeEvent.touches) e.preventDefault();
    const { offsetX, offsetY } = getCoordinates(nativeEvent);
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const nativeEvent = e.nativeEvent;
    if (nativeEvent.touches) e.preventDefault();
    const { offsetX, offsetY } = getCoordinates(nativeEvent);
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    contextRef.current.closePath();
    setIsDrawing(false);
    if (canvasRef.current) savedCanvasImageRef.current = canvasRef.current.toDataURL();
  };

  const getCoordinates = (nativeEvent) => {
    if (nativeEvent.touches && nativeEvent.touches.length > 0) {
      const rect = canvasRef.current.getBoundingClientRect();
      return { offsetX: nativeEvent.touches[0].clientX - rect.left, offsetY: nativeEvent.touches[0].clientY - rect.top };
    }
    return { offsetX: nativeEvent.offsetX, offsetY: nativeEvent.offsetY };
  };

  const clearCanvas = () => {
    if (canvasRef.current && contextRef.current) {
      contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      savedCanvasImageRef.current = null;
    }
  };

  // --- TRANSLATION ---
  const handleTranslate = async (e) => {
    const lang = e.target.value;
    setTargetLanguage(lang);
    if (lang === 'English') { setTranslatedQuestions(null); return; }

    setIsTranslating(true);
    try {
      const response = await fetch('https://excelrs-backend.onrender.com/api/classes/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ questions: test.questions, target_language: lang })
      });
      if (response.ok) {
        const data = await response.json();
        setTranslatedQuestions(data.questions);
      } else {
        alert("Translation service is currently loading. Reverting to English.");
        setTargetLanguage('English');
      }
    } catch (error) {
      console.error(error);
      setTargetLanguage('English');
    } finally {
      setIsTranslating(false);
    }
  };

  // --- BULLETPROOF SUBMIT LOGIC ---
  const submitTest = useCallback(async (isForced = false) => {
    if (isFinishing.current) return; 
    isFinishing.current = true;      
    setIsSubmitting(true);
    
    // Ensure we have an email to send. If the context is missing it for some reason, provide a fallback error.
    if (!user || !user.email) {
       alert("Error: User email not found. Please log in again.");
       setIsSubmitting(false);
       isFinishing.current = false;
       return;
    }

    try {
      // 1. Wipe the persistent session immediately so they can't resume
      const sessionKey = `cbt_session_${testId}_${user.email}`;
      localStorage.removeItem(sessionKey);
      
      // Stop the visual timer from ticking while it processes
      setTimeLeft(0); 

      // 2. Safe Fullscreen Exit
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch (fsError) {
        console.warn("Fullscreen exit bypassed:", fsError);
      }

      // 3. Safe API Call 
      const response = await fetch(`https://excelrs-backend.onrender.com/api/classes/tests/${testId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ student_email: user.email, answers }) // <--- Sending REAL email
      });

      if (!response.ok) {
        throw new Error("Server rejected the submission");
      }

      // 4. Force Navigation no matter what
      alert(isForced ? "Test auto-submitted due to security violation or time expiration." : "Test submitted successfully!");
      
      if (typeof navigate === 'function') {
        navigate('/student');
      } else {
        window.location.href = '/student'; 
      }

    } catch (error) {
      console.error("Critical submission error:", error);
      alert("Something went wrong with the server connection, but we are returning you to the dashboard.");
      if (typeof navigate === 'function') {
        navigate('/student');
      } else {
        window.location.href = '/student'; 
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [testId, token, user, answers, navigate]);

  // Countdown timer with LocalStorage validation
  useEffect(() => {
    if (!hasStarted || timeLeft <= 0 || securityLockout || !user?.email) return; 
    const timer = setInterval(() => {
      const sessionKey = `cbt_session_${testId}_${user.email}`;
      const savedSession = JSON.parse(localStorage.getItem(sessionKey) || '{}');

      if (savedSession.endTime) {
        const remaining = Math.floor((savedSession.endTime - Date.now()) / 1000);
        if (remaining <= 0) {
          clearInterval(timer);
          setTimeLeft(0);
          submitTest(true);
        } else {
          setTimeLeft(remaining);
        }
      } else {
        setTimeLeft(prev => {
          if (prev <= 1) { clearInterval(timer); submitTest(true); return 0; }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStarted, timeLeft, submitTest, securityLockout, testId, user]);

  // Continuous sync of Answers to LocalStorage
  useEffect(() => {
    if (hasStarted && !isFinishing.current && user?.email) {
      const sessionKey = `cbt_session_${testId}_${user.email}`;
      const savedSession = JSON.parse(localStorage.getItem(sessionKey) || '{}');
      if (savedSession.endTime) {
        localStorage.setItem(sessionKey, JSON.stringify({
          ...savedSession,
          answers
        }));
      }
    }
  }, [answers, hasStarted, testId, user]);

  const triggerWarning = useCallback((reason) => {
    const now = Date.now();
    if (now - lastWarningTime.current < 5000) return;
    lastWarningTime.current = now;

    setWarnings(prev => {
      const newCount = prev + 1;
      if (newCount >= MAX_WARNINGS) { submitTest(true); } 
      else { setSecurityLockout({ count: newCount, reason: reason }); }
      return newCount;
    });
  }, [submitTest]);

  const handleResumeSecureSession = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      setSecurityLockout(null); 
    } catch (err) {
      alert("You MUST allow full screen to resume the assessment.");
    }
  };

  // --- PROCTORING AI ENGINE LOOP ---
  const checkFaces = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState !== 4 || !faceModel) return;
    if (isFinishing.current || securityLockout) return; 

    try {
      const predictions = await faceModel.estimateFaces(videoRef.current, false);
      const numFaces = predictions.length;

      if (numFaces === 0) {
        if (!missingFaceStart.current) {
          missingFaceStart.current = Date.now();
        } else if (Date.now() - missingFaceStart.current > 3000) {
          triggerWarning("No face visible in camera for more than 3 seconds.");
          missingFaceStart.current = null; 
        }
      } else if (numFaces > 1) {
        if (!multipleFaceStart.current) {
          multipleFaceStart.current = Date.now();
        } else if (Date.now() - multipleFaceStart.current > 3000) {
          triggerWarning("Multiple faces detected in the camera frame.");
          multipleFaceStart.current = null;
        }
        missingFaceStart.current = null; 
      } else {
        missingFaceStart.current = null;
        multipleFaceStart.current = null;
      }
    } catch (err) {
      console.warn("Face detection error:", err);
    }
  }, [faceModel, securityLockout, triggerWarning]);

  useEffect(() => {
    let interval;
    if (hasStarted && isModelLoaded && !securityLockout) {
      interval = setInterval(checkFaces, 1000);
    }
    return () => clearInterval(interval);
  }, [hasStarted, isModelLoaded, securityLockout, checkFaces]);

  // Anti-Cheat Events
  useEffect(() => {
    if (!hasStarted) return;
    const handleVisibilityChange = () => { if (!isFinishing.current && document.hidden) triggerWarning("You switched tabs or minimized the browser."); };
    const handleFullscreenChange = () => { if (!isFinishing.current && !document.fullscreenElement) triggerWarning("You exited Full-Screen mode."); };
    const handleContextMenu = (e) => e.preventDefault();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [hasStarted, triggerWarning]);

  const startSecureSession = () => {
    if (!user || !user.email) {
      alert("Error: User identity not found. Please re-login to start the test.");
      return;
    }

    // Create the persistent session timer if it doesn't exist
    const sessionKey = `cbt_session_${testId}_${user.email}`;
    const savedSession = JSON.parse(localStorage.getItem(sessionKey) || '{}');
    
    if (!savedSession.endTime) {
      const end = Date.now() + (timeLeft * 1000);
      localStorage.setItem(sessionKey, JSON.stringify({
        ...savedSession,
        endTime: end,
        answers: answers
      }));
    }

    setHasStarted(true);
  };

  const handleAnswerChange = (questionIndex, value) => setAnswers({ ...answers, [questionIndex]: value });
  const toggleReview = (idx) => setMarkedForReview(prev => ({ ...prev, [idx]: !prev[idx] }));
  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60) < 10 ? '0' : ''}${seconds % 60}`;
  
  const scrollToQuestion = (idx) => {
    const el = document.getElementById(`question-${idx}`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
  };

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => console.warn(`Fullscreen blocked: ${err.message}`));
    } else if (elem.webkitRequestFullscreen) { elem.webkitRequestFullscreen(); } 
    else if (elem.msRequestFullscreen) { elem.msRequestFullscreen(); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-400">Loading Secure Environment...</div>;
  if (!test) return null;

  const activeQuestions = translatedQuestions || test.questions;
  
  // Calculate if the user has a saved session to show the "Resume" button safely
  let isResuming = false;
  if (user && user.email) {
    isResuming = !!JSON.parse(localStorage.getItem(`cbt_session_${testId}_${user.email}`) || '{}').endTime;
  }

  return (
    <>
      {/* --- THE PERMANENT WEBCAM MODULE --- */}
      <div className={`fixed z-[60] overflow-hidden transition-all duration-700 ease-in-out bg-slate-800 flex items-center justify-center ${
        !hasStarted
          ? 'top-8 left-1/2 -translate-x-1/2 w-80 h-56 rounded-2xl border-4 border-slate-300 shadow-2xl'
          : `bottom-8 right-8 w-48 h-36 rounded-2xl border-4 border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${securityLockout ? 'opacity-0 pointer-events-none' : 'opacity-100'}`
      }`}>
        {hasStarted && (
          <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-md shadow-sm z-10 flex items-center gap-1.5 animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full"></div> REC
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover scale-x-[-1] ${!cameraEnabled ? 'hidden' : 'block'}`}
        />

        {!cameraEnabled && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-bold text-sm text-center px-4 bg-slate-800/90 backdrop-blur-sm z-10">
            {cameraError ? cameraError : "Waiting for camera permission..."}
          </div>
        )}
      </div>

      {/* --- VIEW 1: GATEWAY (Pre-Test Screen) --- */}
      {!hasStarted && (
        <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="bg-white rounded-3xl p-10 max-w-lg w-full shadow-2xl space-y-6 mt-48 relative">
            
            <div>
              <h1 className="text-2xl font-black text-slate-900 m-0">Proctored Assessment</h1>
              <p className="text-slate-500 font-bold mt-2">Excelrs Eval Security Protocol</p>
            </div>
            
            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6 text-left space-y-3">
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 m-0">Rules of Engagement:</h3>
              <ul className="text-sm font-semibold text-slate-600 space-y-2 list-disc pl-4 m-0">
                <li>This test will launch in <strong>Full-Screen Mode</strong>.</li>
                <li>You have exactly <strong>{test.duration || 60} minutes</strong> to complete it.</li>
                <li>Your <strong>webcam</strong> will be actively monitored by AI.</li>
                <li>Leaving the camera view or switching tabs will trigger a violation.</li>
                <li className="text-red-600 font-black">3 violations will result in automatic submission.</li>
              </ul>
            </div>

            <div className="space-y-3 pt-2">
              <button 
                onClick={() => {
                  enterFullscreen();
                  startSecureSession();
                }} 
                disabled={!cameraEnabled || !isModelLoaded}
                className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-black py-4 rounded-xl transition-all shadow-lg text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShieldCheck size={24} /> 
                {cameraEnabled && isModelLoaded 
                  ? (isResuming ? "Resume Secure Mode" : "Enter Secure Mode") 
                  : (!cameraEnabled ? "Waiting for Camera..." : "Loading AI Monitor...")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- VIEW 2: ACTIVE SECURED EXAM PAGE --- */}
      {hasStarted && (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none relative pb-12">
          {securityLockout && (
            <div className="fixed inset-0 z-[100] bg-red-900/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
              <div className="bg-white rounded-3xl p-12 max-w-xl w-full shadow-2xl space-y-6 transform animate-in zoom-in-95 duration-200">
                <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle size={50} /></div>
                <h2 className="text-3xl font-black text-slate-900 m-0 uppercase tracking-tight">Security Violation</h2>
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 space-y-2">
                  <p className="text-red-800 font-black text-lg m-0">Strike {securityLockout.count} of {MAX_WARNINGS}</p>
                  <p className="text-red-600 font-bold m-0">{securityLockout.reason}</p>
                </div>
                <p className="text-slate-500 font-bold">Your testing environment has been paused. You must return to the secure full-screen view to continue.</p>
                <button onClick={handleResumeSecureSession} className="w-full bg-slate-900 hover:bg-red-600 text-white font-black py-5 rounded-xl transition-all shadow-xl text-lg mt-4">I Understand — Resume Assessment</button>
              </div>
            </div>
          )}

          <header className="bg-white border-b-2 border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm relative">
            <div className="z-10 flex items-center gap-6">
              <div>
                <h1 className="text-xl font-black text-slate-900 m-0">{test.title}</h1>
                <div className="flex items-center gap-3 mt-1">
                  {isModelLoaded ? <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"><Camera size={12}/> AI Active</span> : <span className="flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200"><CameraOff size={12}/> AI Loading...</span>}
                </div>
              </div>
              
              <div className={`flex items-center gap-2 border-2 rounded-xl px-3 py-1.5 ml-4 transition-all ${isTranslating ? 'bg-blue-50 border-blue-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'}`}>
                {isTranslating ? <Loader2 size={16} className="text-blue-600 animate-spin" /> : <Globe size={16} className="text-slate-400" />}
                <select 
                  value={targetLanguage} 
                  onChange={handleTranslate} 
                  disabled={isTranslating}
                  className={`bg-transparent border-none text-sm font-black outline-none transition-colors ${isTranslating ? 'text-blue-600 cursor-not-allowed' : 'text-slate-700 cursor-pointer'}`}
                >
                  {isTranslating ? <option value={targetLanguage}>Translating...</option> : LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
              </div>

              <button 
                onClick={() => setIsScratchpadOpen(!isScratchpadOpen)}
                className={`flex items-center gap-2 border-2 rounded-xl px-4 py-1.5 font-black text-sm transition-all ${isScratchpadOpen ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-slate-800 hover:bg-slate-900 text-white border-slate-800'}`}
              >
                <Edit3 size={16} /> {isScratchpadOpen ? 'Close Scratchpad' : 'Open Scratchpad'}
              </button>
            </div>

            <div className="flex items-center gap-6 z-10">
              {warnings > 0 && <div className="bg-red-100 text-red-700 font-black px-4 py-2 rounded-xl flex items-center gap-2 border-2 border-red-200 animate-pulse"><AlertTriangle size={18} /> Strike {warnings}/{MAX_WARNINGS}</div>}
              <div className={`font-black text-2xl flex items-center gap-3 px-6 py-2 rounded-xl border-2 ${timeLeft < 300 ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                <Clock size={24} /> {formatTime(timeLeft)}
              </div>
              <button onClick={() => { if(window.confirm("Are you sure you want to submit?")) submitTest(false); }} disabled={isSubmitting || securityLockout} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-3 rounded-xl transition-colors shadow-md flex items-center gap-2 disabled:opacity-50">
                 {isSubmitting ? "Saving..." : "Submit Test"} <CheckCircle2 size={18} />
              </button>
            </div>
          </header>

          <main className={`flex-1 max-w-7xl w-full mx-auto p-8 flex flex-col lg:flex-row gap-8 relative z-10 ${securityLockout ? 'blur-sm pointer-events-none select-none' : ''}`}>
            
            <div className="flex-1 space-y-8 pb-32">
              {activeQuestions?.map((q, idx) => (
                <div key={idx} id={`question-${idx}`} className={`bg-white rounded-2xl p-8 shadow-sm border-2 scroll-m-24 transition-colors ${markedForReview[idx] ? 'border-amber-200 ring-2 ring-amber-100/50' : 'border-slate-200'}`}>
                  <div className="flex gap-4 items-start mb-6">
                    <span className="bg-slate-800 text-white px-4 py-1.5 rounded-lg text-sm font-black tracking-widest shrink-0">Q{idx + 1}</span>
                    <div className="flex-1">
                      <p className="font-black text-slate-800 text-lg m-0">{q.text}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">{q.points} Points</span>
                        <button onClick={() => toggleReview(idx)} className={`flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded transition-colors border-2 ${markedForReview[idx] ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200'}`}>
                          <Flag size={14} /> {markedForReview[idx] ? 'Flagged for Review' : 'Mark for Review'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {q.type === 'mcq' && (
                    <div className="space-y-3 pl-14">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = answers[idx] === optIdx.toString();
                        return (
                          <label key={optIdx} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50/50 text-blue-900' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700'}`}>
                            <input type="radio" name={`question-${idx}`} value={optIdx} checked={isSelected} onChange={(e) => handleAnswerChange(idx, e.target.value)} className="w-5 h-5 text-blue-600 accent-blue-600 cursor-pointer" />
                            <span className="font-bold text-base">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'essay' && (
                    <div className="pl-14">
                      <textarea placeholder="Type your answer here..." value={answers[idx] || ''} onChange={(e) => handleAnswerChange(idx, e.target.value)} className="w-full min-h-[200px] p-6 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-semibold text-slate-700 resize-y bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="hidden lg:block w-72 shrink-0">
              <div className="sticky top-28 bg-white rounded-2xl p-6 shadow-sm border-2 border-slate-200">
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2 m-0 mb-6"><LayoutGrid size={20} className="text-blue-600" /> Test Overview</h3>
                <div className="grid grid-cols-5 gap-2">
                  {activeQuestions?.map((q, idx) => {
                    const isAnswered = answers[idx] !== undefined && answers[idx].toString().trim() !== '';
                    const isMarked = markedForReview[idx];
                    let btnClasses = 'bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600';
                    if (isMarked) btnClasses = 'bg-amber-100 border-amber-400 text-amber-800 shadow-sm hover:bg-amber-200';
                    else if (isAnswered) btnClasses = 'bg-blue-600 border-blue-600 text-white shadow-sm hover:bg-blue-700';

                    return (
                      <button key={idx} onClick={() => scrollToQuestion(idx)} className={`aspect-square rounded-lg font-black text-sm transition-all border-2 flex items-center justify-center relative ${btnClasses}`}>
                        {idx + 1}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </main>

          <div className={`fixed top-0 right-0 h-screen w-[450px] bg-white border-l-4 border-slate-300 shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isScratchpadOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-4 border-b bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2"><Edit3 className="text-amber-400" size={20} /><h3 className="font-black text-base m-0">Digital Scratchpad</h3></div>
              <button onClick={() => setIsScratchpadOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="flex border-b bg-slate-50 shrink-0">
              <button onClick={() => setScratchpadMode('notes')} className={`flex-1 py-3 text-sm font-black transition-all flex items-center justify-center gap-2 border-b-4 ${scratchpadMode === 'notes' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><FileText size={16} /> Notepad</button>
              <button onClick={() => setScratchpadMode('sketch')} className={`flex-1 py-3 text-sm font-black transition-all flex items-center justify-center gap-2 border-b-4 ${scratchpadMode === 'sketch' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Edit3 size={16} /> Sketchpad (Drawing)</button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col p-4 bg-slate-100">
              {scratchpadMode === 'notes' ? (
                <textarea value={scratchpadText} onChange={(e) => setScratchpadText(e.target.value)} placeholder="Jot down formulas..." className="w-full flex-1 p-4 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-sm text-slate-700 resize-none shadow-inner leading-relaxed" />
              ) : (
                <div className="flex-1 flex flex-col gap-3">
                  <div className="bg-white p-3 border-2 border-slate-200 rounded-xl flex items-center justify-between gap-4 shrink-0 shadow-sm">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setIsEraser(false); setBrushColor('#1e293b'); }} className={`w-6 h-6 rounded-full border-2 bg-slate-800 ${brushColor === '#1e293b' && !isEraser ? 'ring-2 ring-blue-500 scale-110' : ''}`} />
                      <button onClick={() => { setIsEraser(false); setBrushColor('#2563eb'); }} className={`w-6 h-6 rounded-full border-2 bg-blue-600 ${brushColor === '#2563eb' && !isEraser ? 'ring-2 ring-blue-500 scale-110' : ''}`} />
                      <button onClick={() => { setIsEraser(false); setBrushColor('#dc2626'); }} className={`w-6 h-6 rounded-full border-2 bg-red-600 ${brushColor === '#dc2626' && !isEraser ? 'ring-2 ring-blue-500 scale-110' : ''}`} />
                      <button onClick={() => setIsEraser(true)} className={`text-xs font-black px-2.5 py-1 rounded-md border transition-all ${isEraser ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>Eraser</button>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="range" min="1" max="10" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-20 accent-blue-600"/>
                      <button onClick={clearCanvas} className="p-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors" title="Clear Board"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="flex-1 bg-white border-2 border-slate-200 rounded-xl overflow-hidden relative shadow-inner">
                    <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="bg-white block cursor-crosshair h-full w-full" />
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center shrink-0">
              <p className="text-[10px] font-bold text-slate-400 m-0">The scratchpad is private & clears automatically on test completion.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}