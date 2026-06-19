import React, { useState, useContext } from 'react';
import { LogIn, UserPlus, GraduationCap, School } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function Login() {
  const { login } = useContext(AuthContext);
  
  // --- UI STATE CONFIGURATIONS ---
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between Login and Sign Up modes
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    if (isSignUp) {
      // --- REGISTRATION LOGIC ---
      try {
        const response = await fetch('https://excelrs-backend.onrender.com/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            name: name,
            role: role,
            password: password
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'Registration failed. Please try again.');
        }

        setSuccessMessage("🎉 Account created successfully! You can now sign in.");
        setIsSignUp(false); // Switch back to login mode automatically
        setPassword(''); // Clear password field for safety
      } catch (err) {
        setErrorMessage(err.message);
      } finally {
        setLoading(false);
      }

    } else {
      // --- STANDARD LOGIN LOGIC ---
      try {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await fetch('https://excelrs-backend.onrender.com/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'Invalid email or password');
        }

        login(data.access_token, { name: email.split('@')[0], role: role });
        
        // Direct users to their corresponding operational hubs
        if (role === 'teacher') {
          window.location.href = '/teacher';
        } else {
          window.location.href = '/student';
        }
        
      } catch (err) {
        setErrorMessage(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-slate-200">
        
        {/* Dynamic Header Branding based on state */}
        <div className="text-center">
          <img 
            src="/banner.jpg" 
            alt="Excelrs EVAL" 
            className="h-16 w-auto mx-auto mb-6 object-contain" 
          />
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-slate-500 mt-1 text-sm">
            {isSignUp ? 'Register a local profile credentials set' : 'Please sign in to access your assessment portal'}
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              role === 'student' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap size={18} />
            Student
          </button>
          <button
            type="button"
            onClick={() => setRole('teacher')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              role === 'teacher' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <School size={18} />
            Teacher
          </button>
        </div>

        {/* Dynamic Status Alert Message Boxes */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm font-medium text-center">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl p-3 text-sm font-medium text-center">
            {successMessage}
          </div>
        )}

        {/* Core Multi-purpose Form Execution Panel */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Conditional Field: Only display "Full Name" input if signing up */}
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.com"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2"
          >
            {loading 
              ? 'Processing...' 
              : isSignUp 
                ? `Register as ${role === 'student' ? 'Student' : 'Teacher'}` 
                : `Sign In as ${role === 'student' ? 'Student' : 'Teacher'}`
            }
          </button>
        </form>

        {/* Bottom Switch Trigger Link */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition"
          >
            {isSignUp 
              ? 'Already have an profile credential set? Sign In' 
              : "Don't have an account? Sign Up"
            }
          </button>
        </div>

      </div>
    </div>
  );
}