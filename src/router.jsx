import React from 'react';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Cases from './pages/Cases.jsx';
import CaseCreate from './pages/CaseCreate.jsx';
import CaseDetailRefactored from './pages/CaseDetailRefactored.jsx';
import KnowledgeManagement from './pages/KnowledgeManagement.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';

const routes = [
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'cases', element: <Cases /> },
      { path: 'cases/new', element: <CaseCreate /> },
      { path: 'cases/:id', element: <CaseDetailRefactored /> },
      { path: 'knowledge', element: <KnowledgeManagement /> },
      { path: 'files', element: <Navigate to="knowledge" replace /> },
      { path: 'analysis', element: <Navigate to="cases" replace /> },
      { path: 'settings', element: <Settings /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
];

export default routes;
