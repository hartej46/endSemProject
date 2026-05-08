import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, RefreshCw, TrendingUp } from 'lucide-react';
import { toast } from 'react-toastify';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY;
const CACHE_KEY = 'dashboard_news_cache';
const CACHE_TIME = 15 * 60 * 1000;

const NewsDashboard = ({ onDataUpdate }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [category, setCategory] = useState('science');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (onDataUpdate) onDataUpdate(articles);
  }, [articles]);

  const fetchNews = async (force = false) => {
    setLoading(true);
    setError(null);
    const cached = localStorage.getItem(CACHE_KEY);
    if (!force && cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TIME) {
        setArticles(data);
        setLoading(false);
        return;
      }
    }

    try {
      const response = await axios.get(
        `https://newsdata.io/api/1/latest?apikey=${NEWS_API_KEY}&q=space OR NASA OR astronomy&category=${category}&language=en`
      );
      const newsData = (response.data.results || []).slice(0, 10).map(article => ({
        title: article.title,
        description: article.description,
        url: article.link,
        urlToImage: article.image_url,
        publishedAt: article.pubDate,
        author: article.creator ? article.creator[0] : null,
        source: { name: article.source_name || article.source_id || 'Unknown' }
      }));
      setArticles(newsData);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: newsData, timestamp: Date.now() }));
      toast.success('News refreshed.');
    } catch (err) {
      setError('Failed to fetch news.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNews(); }, [category]);

  const getProcessedArticles = () => {
    let filtered = articles.filter(article => 
      article.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.source.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    } else if (sortBy === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }
    return filtered;
  };

  const getSourceDistribution = () => {
    const sources = articles.reduce((acc, art) => {
      acc[art.source.name] = (acc[art.source.name] || 0) + 1;
      return acc;
    }, {});
    return {
      labels: Object.keys(sources),
      datasets: [{
        data: Object.values(sources),
        backgroundColor: ['#0ea5e9', '#22d3ee', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22', '#ff6b6b', '#5f27cd'],
      }]
    };
  };

  return (
    <div className="news-section">
      <div className="card">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Breaking News</h2>
          <button 
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
            onClick={() => fetchNews(true)}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Search and Sort Controls */}
        <div className="flex flex-col md:flex-row gap-3 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search title, source, author..." 
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-pink-500/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 min-w-[160px]"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">Sort by Date</option>
            <option value="title">Sort by Title</option>
          </select>
        </div>

        {/* News Feed */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
            {getProcessedArticles().map((article, idx) => (
              <a 
                key={idx} 
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`relative flex flex-col md:flex-row gap-6 p-5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-pink-500/50 transition-all group block shadow-sm ${idx === 0 ? 'border-pink-500/60 ring-1 ring-pink-500/10' : ''}`}
              >
                {/* ID Badge */}
                <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-pink-500 text-white text-[11px] font-bold flex items-center justify-center z-10 shadow-lg">
                  {idx + 1}
                </div>

                {/* Left: Image */}
                {article.urlToImage && (
                  <div className="md:w-36 md:h-28 shrink-0">
                    <img 
                      src={article.urlToImage} 
                      alt="" 
                      className="w-full h-full object-cover rounded-xl shadow-inner border border-slate-100 dark:border-slate-800"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}

                {/* Middle: Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">{article.source.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg leading-tight mb-2 text-slate-800 dark:text-slate-100 group-hover:text-pink-500 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {article.description}
                  </p>
                </div>

                {/* Right: Icon */}
                <div className="absolute top-5 right-5 text-pink-500/40 group-hover:text-pink-500 transition-all">
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-current" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="card h-fit sticky top-8">
        <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
          <TrendingUp size={22} className="text-pink-500" /> 
          <span>Sources</span>
        </h2>
        <div style={{ height: '350px' }} className="flex justify-center">
          <Pie 
            data={getSourceDistribution()} 
            options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              plugins: {
                legend: { 
                  position: 'bottom', 
                  labels: { 
                    boxWidth: 10, 
                    usePointStyle: true,
                    padding: 20, 
                    color: '#94a3b8',
                    font: { size: 11, weight: '600' }
                  } 
                }
              }
            }} 
          />
        </div>
      </div>
    </div>
  );
};

export default NewsDashboard;
