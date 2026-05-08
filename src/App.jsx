import React, { useState, useEffect } from 'react';
import ISSTracker from './components/ISSTracker';
import NewsDashboard from './components/NewsDashboard';
import AIChatbot from './components/AIChatbot';
import { Moon, Sun, Monitor } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  // Dashboard data state to sync with Chatbot
  const [dashboardData, setDashboardData] = useState({
    iss: { lat: 0, lng: 0, speed: 0, nearest: '', peopleCount: 0, peopleNames: [] },
    news: []
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    toast.success(`Switched to ${newTheme} mode.`, { autoClose: 2000 });
  };

  return (
    <div className="container min-h-screen">
      <header className="flex justify-between items-start mb-8 py-4">
        <div>
          <span className="text-blue-600 font-bold text-[10px] uppercase tracking-[0.2em] mb-1 block">Mission Control Dashboard</span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Real-Time ISS and News Intelligence</h1>
        </div>
        <button 
          onClick={toggleTheme}
          className="px-5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
        >
          {theme === 'light' ? (
            <><Moon size={14} /> Switch to Dark</>
          ) : (
            <><Sun size={14} /> Switch to Light</>
          )}
        </button>
      </header>

      <main>
        <ISSTracker onDataUpdate={(data) => setDashboardData(prev => ({ ...prev, iss: data }))} />
        
        <NewsDashboard onDataUpdate={(data) => setDashboardData(prev => ({ ...prev, news: data }))} />
      </main>

      <footer className="mt-20 py-10 border-t border-gray-100 text-center text-gray-400 text-sm">
        <p>&copy; 2026 Mission Control Dashboard. Data from Open-Notify & NewsAPI.</p>
      </footer>

      {/* Global AI Chatbot */}
      <AIChatbot dashboardData={dashboardData} />
      
      <ToastContainer position="top-right" autoClose={2000} hideProgressBar newestOnTop closeOnClick theme={theme === 'dark' ? 'dark' : 'light'} />
    </div>
  );
}

export default App;
