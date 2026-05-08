import { Moon, Sun, Satellite, Newspaper, BarChart2, Menu, X } from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { id: 'iss', label: 'ISS Tracker', icon: <Satellite size={16} /> },
  { id: 'news', label: 'News', icon: <Newspaper size={16} /> },
  { id: 'charts', label: 'Charts', icon: <BarChart2 size={16} /> },
]

export default function Navbar({ theme, toggleTheme, activeSection, setActiveSection }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <nav className="navbar">
        <a className="navbar-brand" href="#" onClick={e => e.preventDefault()}>
          <div className="navbar-logo">🛰️</div>
          <span>ISS Dashboard</span>
        </a>

        <ul className="navbar-nav">
          {navItems.map(item => (
            <li key={item.id}>
              <button
                className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => setActiveSection(item.id)}
              >
                {item.icon}
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="navbar-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
            <span className="live-dot" />
            <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>LIVE</span>
          </div>
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme" id="theme-toggle-btn">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="btn-icon" style={{ display: 'none' }} onClick={() => setMobileOpen(o => !o)} id="mobile-menu-btn">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', top: 64, left: 0, right: 0, zIndex: 99,
          background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
          padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px'
        }}>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={() => { setActiveSection(item.id); setMobileOpen(false) }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
