import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="p-6 text-gray-600">加载中...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
