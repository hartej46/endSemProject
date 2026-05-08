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
        {/* Header with Title and Refresh */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Breaking News</h2>
          <button 
            className="flex items-center gap-2 px-4 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            onClick={() => fetchNews(true)}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Search and Sort Pill Row */}
        <div className="flex gap-2 mb-8">
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="Search title, source, author..." 
              className="w-full px-5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full outline-none text-sm focus:border-pink-500/50 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select 
              className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full outline-none text-sm cursor-pointer hover:border-pink-500/50 appearance-none min-w-[130px]"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date">Sort by Date</option>
              <option value="title">Sort by Title</option>
            </select>
            <select 
              className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full outline-none text-sm cursor-pointer hover:border-pink-500/50 appearance-none uppercase font-bold text-cyan-400"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="science">Science</option>
              <option value="technology">Tech</option>
              <option value="world">World</option>
              <option value="top">Top</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-slate-100/50 dark:bg-slate-800/50 animate-pulse rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {getProcessedArticles().map((article, idx) => (
              <a 
                key={idx} 
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-3 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100/50 dark:border-slate-800/50 rounded-2xl hover:border-pink-500/30 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all group block shadow-sm"
              >
                <div className="w-9 h-9 rounded-full bg-pink-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-lg shadow-pink-500/20">
                  {idx + 1}
                </div>

                {article.urlToImage && (
                  <img 
                    src={article.urlToImage} 
                    alt="" 
                    className="w-14 h-14 object-cover rounded-xl shrink-0 border border-white/5"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider truncate">{article.source.name}</span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <h3 className="font-bold text-[14px] leading-tight text-slate-800 dark:text-slate-100 group-hover:text-pink-500 transition-colors line-clamp-1">{article.title}</h3>
                </div>

                <div className="w-6 h-6 flex items-center justify-center text-pink-500 opacity-30 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                  <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-current" />
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
