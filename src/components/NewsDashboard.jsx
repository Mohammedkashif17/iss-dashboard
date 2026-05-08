import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Search, ExternalLink, User, Newspaper } from 'lucide-react'
import { toast } from 'react-hot-toast'

const CATEGORIES = [
  { id: 'technology', label: '💻 Technology', color: '#6366f1' },
  { id: 'science', label: '🔬 Science', color: '#06b6d4' },
  { id: 'health', label: '❤️ Health', color: '#ef4444' },
  { id: 'world', label: '🌍 World', color: '#10b981' },
  { id: 'business', label: '📈 Business', color: '#f59e0b' },
]

function formatDate(dateStr) {
  if (!dateStr) return 'Recently'
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } catch { return 'Recently' }
}

function NewsCard({ article }) {
  const [imgError, setImgError] = useState(false)
  return (
    <div className="news-card">
      {article.image && !imgError ? (
        <img src={article.image} alt={article.title} className="news-image" onError={() => setImgError(true)} loading="lazy" />
      ) : (
        <div className="img-placeholder">📰</div>
      )}
      <div className="news-content">
        <div className="news-source">
          <span>{article.source || 'News Hub'}</span>
          <span>{formatDate(article.date)}</span>
        </div>
        <h3 className="news-title">{article.title}</h3>
        <p className="news-description">{article.description}</p>
        <div className="news-footer">
          <span className="news-author"><User size={11} style={{ marginRight: 4, display: 'inline' }} /> Global News</span>
          <a href={article.link} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
            Read More <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  )
}

export default function NewsDashboard({ context }) {
  const [activeCategory, setActiveCategory] = useState('technology')
  const [allNews, setAllNews] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  const fetchNews = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Using ok.surf API which is CORS-friendly and free (no key needed)
      const res = await fetch('https://ok.surf/api/v1/cors/news-feed')
      const data = await res.json()
      
      // Map API categories to our structure
      const mapped = {
        technology: data.Technology || [],
        science: data.Science || [],
        health: data.Health || [],
        world: data.World || [],
        business: data.Business || [],
      }
      
      setAllNews(mapped)
      if (context.newsData) Object.assign(context.newsData, mapped)
    } catch (err) {
      setError('Failed to load news. The external news service might be temporarily down.')
      toast.error('News service unreachable')
    } finally {
      setLoading(false)
    }
  }, [context.newsData])

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  const articles = allNews[activeCategory] || []
  const filtered = articles.filter(a => !search || a.title?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">
          <span className="icon"><Newspaper size={22} /></span>
          Global News Dashboard
        </h2>
        <button className="btn btn-secondary" onClick={fetchNews} disabled={loading}>
          <RefreshCw size={15} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Refresh All
        </button>
      </div>

      <div className="search-bar">
        <div style={{ position: 'relative', maxWidth: 320, flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Search current articles..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="category-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
            style={activeCategory === cat.id ? { background: cat.color, borderColor: cat.color } : {}}
          >
            {cat.label} ({allNews[cat.id]?.length || 0})
          </button>
        ))}
      </div>

      {error ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '2.5rem' }}>📡</div>
          <h3>Service Unavailable</h3>
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        </div>
      ) : (
        <div className="news-grid">
          {loading ? [...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 300 }} />)
            : filtered.map((article, i) => <NewsCard key={i} article={article} />)
          }
        </div>
      )}
    </div>
  )
}
