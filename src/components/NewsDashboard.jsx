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
    if (!NEWS_API_KEY) {
      console.warn('News API key is missing.');
      setLoading(false);
      return;
    }
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
    <div className="mt-8">
      <div className="card">
        {/* Header Section */}
        <div className="ncr-top mb-6">
          <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Breaking News</h2>
          <button 
            className="btn-pill"
            onClick={() => fetchNews(true)}
          >
            Refresh
          </button>
        </div>

        {/* Search and Sort Controls */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="Search title, source, author..." 
              className="w-full px-4 py-2.5 bg-white/20 border border-current/10 rounded-xl outline-none text-xs focus:ring-2 focus:ring-orange-500/10 transition-all shadow-sm"
              style={{ backgroundColor: 'var(--panel-elev)', borderColor: 'var(--border)' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2.5 rounded-xl outline-none text-xs cursor-pointer shadow-sm font-bold"
            style={{ backgroundColor: 'var(--panel-elev)', borderColor: 'var(--border)', border: '1px solid var(--border)' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">Sort by Date</option>
            <option value="title">Sort by Title</option>
          </select>
        </div>

        {/* News Feed */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-white/10 animate-pulse rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
            {getProcessedArticles().map((article, idx) => (
              <a 
                key={idx} 
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex items-center gap-3 p-1 rounded-xl transition-all group block mb-1"
                style={{ backgroundColor: 'var(--panel-elev)', border: '1px solid var(--border)' }}
              >
                {/* ID Badge */}
                <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-5 h-5 rounded-full text-white text-[9px] font-black flex items-center justify-center z-10 shadow-md border-2 border-white"
                  style={{ backgroundColor: 'var(--accent)' }}>
                  {idx + 1}
                </div>

                {/* Image */}
                <div className="w-14 h-9 shrink-0 overflow-hidden rounded-lg ml-2"
                  style={{ backgroundColor: 'var(--bg)' }}>
                  {article.urlToImage ? (
                    <img 
                      src={article.urlToImage} 
                      alt="" 
                      className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                      <TrendingUp size={12} />
                    </div>
                  )}
                </div>

                {/* Content - Ultra Condensed */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase truncate" style={{ color: 'var(--accent-alt)' }}>
                    {article.source.name}
                  </span>
                  <span className="text-[10px] font-bold opacity-40 whitespace-nowrap">
                    {article.publishedAt ? new Date(article.publishedAt).toLocaleString() : ''}
                  </span>
                </div>

                {/* Action Icon - Peach/Orange Box with Triangle */}
                <div className="shrink-0 mr-1 w-6 h-6 rounded flex items-center justify-center border"
                  style={{ backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent-soft)' }}>
                  <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] transition-all"
                    style={{ borderTopColor: 'var(--accent)' }} />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsDashboard;
