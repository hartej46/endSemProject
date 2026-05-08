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
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    toast.success(`Switched to ${newTheme} mode.`, { autoClose: 2000 });
  };

  return (
    <div className="container min-h-screen">
      <header className="flex justify-between items-center mb-10 py-6">
        <div>
          <span className="text-accent font-bold text-xs uppercase tracking-widest">Mission Control Dashboard</span>
          <h1 className="text-3xl font-extrabold mt-1">Real-Time ISS and News Intelligence</h1>
        </div>
        <button 
          onClick={toggleTheme}
          className="btn-secondary flex items-center gap-2 hover:bg-gray-100"
        >
          {theme === 'light' ? (
            <><Moon size={18} /> Switch to Dark</>
          ) : (
            <><Sun size={18} /> Switch to Light</>
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
