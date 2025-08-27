import React from 'react';
import { useRoutes } from 'react-router-dom';
import routes from './router.jsx';
import Toast from './components/Toast.jsx';

export default function App() {
  const element = useRoutes(routes);
  return (
    <>
      {element}
      <Toast />
    </>
  );
}
