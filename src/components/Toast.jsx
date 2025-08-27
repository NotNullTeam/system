import React, { useState, useEffect } from 'react';

let toastId = 0;
const toastCallbacks = new Set();

export function showToast(message, type = 'info', duration = 3000) {
  const id = ++toastId;
  const toast = { id, message, type, duration };
  toastCallbacks.forEach(callback => callback(toast));
  return id;
}

export function showError(message) {
  return showToast(message, 'error', 5000);
}

export function showSuccess(message) {
  return showToast(message, 'success', 3000);
}

export function showWarning(message) {
  return showToast(message, 'warning', 4000);
}

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function addToast(toast) {
      setToasts(prev => [...prev, toast]);
      
      if (toast.duration > 0) {
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toast.id));
        }, toast.duration);
      }
    }

    toastCallbacks.add(addToast);
    return () => toastCallbacks.delete(addToast);
  }, []);

  function removeToast(id) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`max-w-sm p-4 rounded-lg shadow-lg border ${
            toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            toast.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex justify-between items-start">
            <p className="text-sm">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
