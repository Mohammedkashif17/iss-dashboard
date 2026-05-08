import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Search, ExternalLink, Calendar, User, Newspaper } from 'lucide-react'
import { toast } from 'react-hot-toast'

const CATEGORIES = [
  { id: 'technology', label: '💻 Technology', color: '#6366f1' },
  { id: 'science', label: '🔬 Science', color: '#06b6d4' },
  { id: 'space', label: '🚀 Space', color: '#8b5cf6' },
  { id: 'health', label: '❤️ Health', color: '#ef4444' },
  { id: 'world', label: '🌍 World', color: '#10b981' },
]

const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

function getCached(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { data, timestamp } = JSON.parse(raw)
    if (Date.now() - timestamp > CACHE_TTL) { localStorage.removeItem(key); return null }
    return data
  } catch { return null }
}

function setCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() })) } catch {}
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown date'
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return dateStr }
}

function NewsCardSkeleton() {
  return (
    <div className="news-card">
      <div className="skeleton" style={{ height: 180 }} />
      <div className="news-content">
        <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 18, marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 18, width: '80%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 14, marginBottom: 4 }} />
        <div className="skeleton" style={{ height: 14, width: '70%' }} />
      </div>
    </div>
  )
}

function NewsCard({ article }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="news-card">
      {article.urlToImage && !imgError ? (
        <img
          src={article.urlToImage}
          alt={article.title}
          className="news-image"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div className="img-placeholder">📰</div>
      )}
      <div className="news-content">
        <div className="news-source">
          <span>{article.source?.name || 'Unknown Source'}</span>
          <span>{formatDate(article.publishedAt)}</span>
        </div>
        <h3 className="news-title">{article.title || 'No title available'}</h3>
        <p className="news-description">{article.description || 'No description available.'}</p>
        <div className="news-footer">
          <span className="news-author">
            <User size={11} style={{ marginRight: 4, display: 'inline' }} />
            {article.author ? article.author.split(',')[0].substring(0, 25) : 'Unknown'}
          </span>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            Read More <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  )
}

export default function NewsDashboard({ context }) {
  const { newsData: parentNewsData } = context
  const [activeCategory, setActiveCategory] = useState('technology')
  const [allNews, setAllNews] = useState({})
  const [loading, setLoading] = useState({})
  const [errors, setErrors] = useState({})
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('publishedAt')

  const API_KEY = import.meta.env.VITE_NEWS_API_KEY

  const fetchNews = useCallback(async (category, force = false) => {
    const cacheKey = `iss-news-${category}`
    if (!force) {
      const cached = getCached(cacheKey)
      if (cached) { setAllNews(prev => ({ ...prev, [category]: cached })); return }
    }

    setLoading(prev => ({ ...prev, [category]: true }))
    setErrors(prev => ({ ...prev, [category]: null }))

    try {
      // Primary: NewsAPI
      const query = category === 'world' ? 'world news' : category
      const url = `https://newsapi.org/v2/everything?q=${query}&pageSize=10&sortBy=publishedAt&language=en&apiKey=${API_KEY}`
      const res = await fetch(url)
      const data = await res.json()

      if (data.status === 'ok' && data.articles?.length) {
        const articles = data.articles.filter(a => a.title && a.title !== '[Removed]')
        setAllNews(prev => ({ ...prev, [category]: articles }))
        setCache(cacheKey, articles)

        // Update parent context newsData
        if (context.newsData !== undefined) {
          context.newsData[category] = articles
        }
      } else {
        throw new Error(data.message || 'No articles found')
      }
    } catch (err) {
      // Fallback: try top-headlines
      try {
        const res2 = await fetch(`https://newsapi.org/v2/top-headlines?category=${category === 'space' ? 'science' : category}&pageSize=10&language=en&apiKey=${API_KEY}`)
        const data2 = await res2.json()
        if (data2.status === 'ok' && data2.articles?.length) {
          const articles = data2.articles.filter(a => a.title && a.title !== '[Removed]')
          setAllNews(prev => ({ ...prev, [category]: articles }))
          setCache(cacheKey, articles)
        } else {
          throw new Error('Fallback also failed')
        }
      } catch {
        setErrors(prev => ({ ...prev, [category]: 'Failed to load news. Check your API key in .env file.' }))
        toast.error(`Failed to load ${category} news`)
      }
    } finally {
      setLoading(prev => ({ ...prev, [category]: false }))
    }
  }, [API_KEY])

  useEffect(() => {
    CATEGORIES.forEach(cat => fetchNews(cat.id))
  }, [])

  const handleRefresh = () => {
    fetchNews(activeCategory, true)
    toast.success(`Refreshing ${activeCategory} news...`)
  }

  const articles = allNews[activeCategory] || []
  const isLoading = loading[activeCategory]
  const error = errors[activeCategory]

  const filtered = articles
    .filter(a => !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.description?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'publishedAt') return new Date(b.publishedAt) - new Date(a.publishedAt)
      if (sortBy === 'source') return (a.source?.name || '').localeCompare(b.source?.name || '')
      return 0
    })

  // Calculate category counts for context
  useEffect(() => {
    if (Object.keys(allNews).length > 0 && context.newsData !== undefined) {
      Object.assign(context.newsData, allNews)
    }
  }, [allNews])

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <h2 className="section-title">
          <span className="icon"><Newspaper size={22} /></span>
          News Dashboard
        </h2>
        <button className="btn btn-secondary" onClick={handleRefresh} disabled={isLoading} id="refresh-news-btn">
          <RefreshCw size={15} style={isLoading ? { animation: 'spin 0.8s linear infinite' } : {}} />
          Refresh
        </button>
      </div>

      {/* Search & Sort */}
      <div className="search-bar">
        <div style={{ position: 'relative', maxWidth: 320, flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            id="news-search"
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)} id="news-sort">
          <option value="publishedAt">Sort by Date</option>
          <option value="source">Sort by Source</option>
        </select>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {filtered.length} article{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Category tabs */}
      <div className="category-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
            style={activeCategory === cat.id ? { background: cat.color, borderColor: cat.color } : {}}
            id={`cat-tab-${cat.id}`}
          >
            {cat.label}
            {allNews[cat.id] && (
              <span style={{
                marginLeft: 6, background: 'rgba(255,255,255,0.2)', borderRadius: '999px',
                padding: '1px 6px', fontSize: 10
              }}>
                {allNews[cat.id].length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📡</div>
          <h3 style={{ marginBottom: 8 }}>Failed to load news</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 14 }}>{error}</p>
          <button className="btn btn-primary" onClick={handleRefresh}>
            <RefreshCw size={15} /> Try Again
          </button>
        </div>
      )}

      {/* News grid */}
      {!error && (
        <div className="news-grid">
          {isLoading
            ? [...Array(6)].map((_, i) => <NewsCardSkeleton key={i} />)
            : filtered.length > 0
              ? filtered.map((article, i) => <NewsCard key={i} article={article} />)
              : (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
                  <p>No articles found{search ? ` for "${search}"` : ''}.</p>
                </div>
              )
          }
        </div>
      )}

      {/* Cache info */}
      <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
        📦 News cached for 15 minutes · API: NewsAPI.org
      </div>
    </div>
  )
}
