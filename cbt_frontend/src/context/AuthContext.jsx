import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // Import the safe token package reader

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      try {
        // Unpack the backend's signed token wristband package safely
        const decoded = jwtDecode(token);
        
        // FastAPI puts your email in the 'sub' parameter and your role in 'role'
        setUser({
          email: decoded.sub,
          name: decoded.sub.split('@')[0], // Extract username handle for visual dashboard greetings
          role: decoded.role
        });
      } catch (error) {
        console.error("Token decoding parameters failed:", error);
        logout(); // If the token string is corrupt or broken, wipe it clean
      }
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  const login = (jwtToken) => {
    setToken(jwtToken); // Setting token automatically triggers the useEffect script layout block above
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};