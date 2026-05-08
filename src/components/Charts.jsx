import { useEffect, useRef, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import ISSMap from './ISSMap'
import { BarChart2, Zap, Newspaper } from 'lucide-react'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Title, Tooltip, Legend, Filler
)

const CATEGORY_COLORS = {
  technology: '#6366f1',
  science: '#06b6d4',
  space: '#8b5cf6',
  health: '#ef4444',
  world: '#10b981',
}

export default function Charts({ context }) {
  const { issData, issHistory, speedHistory, newsData } = context
  const [activeNewsFilter, setActiveNewsFilter] = useState(null)

  // ISS Speed Line Chart
  const speedChartData = {
    labels: speedHistory.map(p => p.time),
    datasets: [{
      label: 'ISS Speed (km/h)',
      data: speedHistory.map(p => p.speed),
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.1)',
      pointBackgroundColor: '#6366f1',
      pointBorderColor: '#fff',
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.4,
      fill: true,
      borderWidth: 2,
    }],
  }

  const speedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600 },
    plugins: {
      legend: {
        labels: { color: 'var(--text-secondary)', font: { family: 'Inter' } }
      },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.parsed.y.toLocaleString()} km/h`
        }
      },
    },
    scales: {
      x: {
        ticks: { color: 'var(--text-muted)', font: { size: 11 }, maxTicksLimit: 6 },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
      y: {
        ticks: {
          color: 'var(--text-muted)',
          font: { size: 11 },
          callback: v => v.toLocaleString()
        },
        grid: { color: 'rgba(255,255,255,0.05)' },
        suggestedMin: 25000,
        suggestedMax: 29000,
      },
    },
  }

  // News Distribution Doughnut
  const categories = Object.keys(newsData || {}).filter(k => newsData[k]?.length)
  const doughnutData = {
    labels: categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
    datasets: [{
      data: categories.map(c => newsData[c]?.length || 0),
      backgroundColor: categories.map(c => CATEGORY_COLORS[c] || '#6366f1'),
      borderColor: categories.map(c => (CATEGORY_COLORS[c] || '#6366f1') + '88'),
      borderWidth: 2,
      hoverOffset: 8,
    }],
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600 },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: 'var(--text-secondary)',
          font: { family: 'Inter', size: 12 },
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 8,
        }
      },
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.parsed} articles`
        }
      },
    },
    onClick: (event, elements) => {
      if (elements.length) {
        const idx = elements[0].index
        const cat = categories[idx]
        setActiveNewsFilter(activeNewsFilter === cat ? null : cat)
      }
    },
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">
          <span className="icon"><BarChart2 size={22} /></span>
          Charts & Visualizations
        </h2>
      </div>

      <div className="grid-2 section">
        {/* Speed Chart */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} color="var(--warning)" />
            ISS Speed Over Time
            <span className="badge badge-info" style={{ marginLeft: 'auto', fontSize: 11 }}>
              Last {speedHistory.length} readings
            </span>
          </h3>
          {speedHistory.length < 2 ? (
            <div style={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-muted)' }}>
              <div className="spinner" />
              <p style={{ fontSize: 14 }}>Collecting speed data... (updates every 15s)</p>
            </div>
          ) : (
            <div className="chart-container">
              <Line data={speedChartData} options={speedChartOptions} />
            </div>
          )}
        </div>

        {/* News Distribution */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Newspaper size={16} color="var(--cyan)" />
            News Distribution
            {activeNewsFilter && (
              <span className="badge badge-live" style={{ marginLeft: 'auto', cursor: 'pointer' }} onClick={() => setActiveNewsFilter(null)}>
                {activeNewsFilter} ✕
              </span>
            )}
          </h3>
          {categories.length === 0 ? (
            <div style={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-muted)' }}>
              <div className="spinner" />
              <p style={{ fontSize: 14 }}>Loading news data...</p>
            </div>
          ) : (
            <div className="chart-container">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          )}
          {activeNewsFilter && (
            <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Showing <strong style={{ color: CATEGORY_COLORS[activeNewsFilter] }}>{activeNewsFilter}</strong> articles:
              </p>
              {(newsData[activeNewsFilter] || []).slice(0, 3).map((a, i) => (
                <div key={i} style={{ fontSize: 13, padding: '6px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                    {a.title?.substring(0, 60)}...
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ISS Map */}
      <div className="card section">
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, marginBottom: 16 }}>
          🗺️ ISS Live Map
        </h3>
        <ISSMap issData={issData} issHistory={issHistory} />
        <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 24, height: 3, background: '#6366f1', display: 'inline-block', borderRadius: 2 }} />
            Trajectory path
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            🛰️ Current position
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, background: '#6366f1', display: 'inline-block', borderRadius: '50%', opacity: 0.6 }} />
            Previous positions
          </span>
        </div>
      </div>

      {/* Speed stats */}
      {speedHistory.length > 0 && (
        <div className="grid-3 section">
          {[
            { label: 'Current Speed', value: speedHistory[speedHistory.length-1]?.speed?.toLocaleString(), unit: 'km/h', color: 'var(--accent)' },
            { label: 'Max Speed', value: Math.max(...speedHistory.map(s=>s.speed)).toLocaleString(), unit: 'km/h', color: 'var(--warning)' },
            { label: 'Avg Speed', value: Math.round(speedHistory.reduce((a,b) => a+b.speed, 0)/speedHistory.length).toLocaleString(), unit: 'km/h', color: 'var(--success)' },
          ].map((s, i) => (
            <div key={i} className="stat-card" style={{ borderTop: `3px solid ${s.color}` }}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color, marginTop: 4 }}>
                {s.value}
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: 4 }}>{s.unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
