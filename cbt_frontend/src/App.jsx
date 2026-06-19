import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';

// Import all the pages we built
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import TestWindow from './pages/TestWindow';

// A corrected security gatekeeper component for Teachers
const TeacherRoute = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  
  // If there's no token at all, they must log in
  if (!token) return <Navigate to="/" replace />;
  
  // If the user profile is still loading, show a brief loading state instead of booting them out
  if (!user) return <div className="p-8 text-center text-slate-500">Loading educator profile...</div>;
  
  // If they are logged in but are NOT a teacher, redirect to student panel
  if (user.role !== 'teacher') return <Navigate to="/student" replace />;
  
  return children;
};

// A corrected security gatekeeper component for Students
const StudentRoute = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  
  if (!token) return <Navigate to="/" replace />;
  if (!user) return <div className="p-8 text-center text-slate-500">Loading student profile...</div>;
  
  if (user.role !== 'student') return <Navigate to="/teacher" replace />;
  
  return children;
};

function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Login />} />

        {/* Protected Teacher Dashboard Route */}
        <Route 
          path="/teacher" 
          element = {
            <TeacherRoute>
              <TeacherDashboard />
            </TeacherRoute>
          } 
        />

        {/* Protected Student Dashboard Route */}
        <Route 
          path="/student" 
          element = {
            <StudentRoute>
              <StudentDashboard />
            </StudentRoute>
          } 
        />

        {/* Protected Test Taking Environment Route */}
        <Route 
          path="/test/:testId" 
          element = {
            <StudentRoute>
              <TestWindow />
            </StudentRoute>
          } 
        />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}