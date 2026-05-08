import { useState, useEffect } from 'react'
import { RefreshCw, MapPin, Zap, Navigation, Users, Globe, Clock } from 'lucide-react'
import ISSMap from './ISSMap'
import { toast } from 'react-hot-toast'

// Reverse geocode using nominatim
async function getNearestPlace(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=4`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    if (data.address) {
      return data.address.country || data.address.state || data.address.ocean || data.display_name?.split(',').slice(-1)[0]?.trim() || 'Open Ocean'
    }
    return 'Open Ocean'
  } catch {
    return 'Open Ocean'
  }
}

function StatCard({ icon, label, value, unit, color, glowClass }) {
  return (
    <div className={`stat-card ${glowClass || ''}`} style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value" style={{ color, marginTop: 4 }}>
            {value}
            {unit && <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: 4 }}>{unit}</span>}
          </div>
        </div>
        <div style={{ fontSize: '1.8rem', opacity: 0.2 }}>{icon}</div>
      </div>
    </div>
  )
}

export default function ISSTracker({ context }) {
  const { issData, issSpeed, issHistory, astronauts, issLoading, issError, refreshISS } = context
  const [location, setLocation] = useState('Calculating...')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (issData) {
      setLastUpdated(new Date())
      getNearestPlace(issData.lat, issData.lon).then(setLocation)
    }
  }, [issData])

  const handleRefresh = async () => {
    setRefreshing(true)
    refreshISS()
    setTimeout(() => setRefreshing(false), 1500)
  }

  const formatCoord = (val, pos, neg) => {
    if (val === null || val === undefined) return '---'
    const dir = val >= 0 ? pos : neg
    return `${Math.abs(val).toFixed(4)}° ${dir}`
  }

  if (issError) {
    return (
      <div className="section">
        <div className="card">
          <div className="error-state">
            <div className="error-icon">🛸</div>
            <h3>Unable to reach ISS</h3>
            <p style={{ color: 'var(--danger)' }}>{issError}</p>
            <button className="btn btn-primary" onClick={refreshISS}>
              <RefreshCw size={16} /> Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <h1 className="section-title">
          <span className="icon">🛰️</span>
          ISS Live Tracker
          <span className="badge badge-live">
            <span className="live-dot" style={{ width: 6, height: 6 }} />
            LIVE
          </span>
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {lastUpdated && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} />
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing}
            id="refresh-iss-btn"
          >
            <RefreshCw size={15} className={refreshing ? 'spinning' : ''} style={refreshing ? { animation: 'spin 0.8s linear infinite' } : {}} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      {issLoading && !issData ? (
        <div className="grid-4 section">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : (
        <div className="grid-4 section">
          <StatCard
            icon={<Navigation />}
            label="Latitude"
            value={issData ? formatCoord(issData.lat, 'N', 'S') : '---'}
            color="var(--accent)"
            glowClass=""
          />
          <StatCard
            icon={<Globe />}
            label="Longitude"
            value={issData ? formatCoord(issData.lon, 'E', 'W') : '---'}
            color="var(--cyan)"
          />
          <StatCard
            icon={<Zap />}
            label="Speed"
            value={issSpeed ? issSpeed.toLocaleString() : '27,600'}
            unit="km/h"
            color="var(--warning)"
          />
          <StatCard
            icon={<MapPin />}
            label="Location"
            value={location}
            color="var(--success)"
          />
        </div>
      )}

      {/* Map */}
      <div className="section">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={16} color="var(--accent)" />
              Live Map
            </span>
            <span className="pill">
              {issHistory.length} positions tracked
            </span>
          </div>
          <ISSMap issData={issData} issHistory={issHistory} />
        </div>
      </div>

      {/* Bottom row: Trajectory info + Astronauts */}
      <div className="grid-2 section">
        {/* Trajectory */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Navigation size={16} color="var(--accent)" />
            Trajectory
          </h3>
          {issHistory.length === 0 ? (
            <div className="skeleton" style={{ height: 200 }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {[...issHistory].reverse().map((pos, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 12px', background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                  fontSize: 13
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: i === 0 ? 'var(--gradient-1)' : 'var(--bg-card)',
                    border: '1px solid var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: i === 0 ? 'white' : 'var(--text-muted)',
                    flexShrink: 0
                  }}>
                    {i === 0 ? '●' : issHistory.length - i}
                  </div>
                  <span style={{ color: 'var(--text-secondary)', flex: 1 }}>
                    {pos.lat.toFixed(3)}°, {pos.lon.toFixed(3)}°
                  </span>
                  {i === 0 && <span className="badge badge-live" style={{ fontSize: 10 }}>Now</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Astronauts */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={16} color="var(--purple)" />
              People in Space
            </span>
            <span className="badge badge-info" style={{ background: 'rgba(168,85,247,0.2)', color: 'var(--purple)' }}>
              {astronauts.number} aboard
            </span>
          </h3>

          {astronauts.people.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(7)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 48, borderRadius: 'var(--radius-sm)' }} />
              ))}
            </div>
          ) : (
            <div className="astronaut-list" style={{ maxHeight: 320, overflowY: 'auto' }}>
              {astronauts.people.map((person, i) => (
                <div key={i} className="astronaut-item">
                  <div className="astronaut-avatar">
                    {person.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{person.name}</div>
                  </div>
                  <span className="astronaut-craft">{person.craft}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 16, padding: '12px', background: 'rgba(168,85,247,0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(168,85,247,0.3)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--purple)', fontFamily: 'var(--font-heading)' }}>{astronauts.number}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Humans in Space Right Now</div>
          </div>
        </div>
      </div>
    </div>
  )
}
