import React from 'react'
import styles from './Layout.module.css'

const NAV = [
  { section: 'Planung' },
  { panel: 'dashboard',   icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { panel: 'demand',      icon: 'ti-inbox',             label: 'Demand' },
  { panel: 'portfolio',   icon: 'ti-briefcase',         label: 'Portfolio' },
  { panel: 'roadmap',     icon: 'ti-road',              label: 'Roadmap' },
  { section: 'Ressourcen' },
  { panel: 'capacity',    icon: 'ti-users',             label: 'Kapazität' },
  { panel: 'resources',   icon: 'ti-calendar-event',    label: 'Ressourcenzuweisung' },
  { panel: 'mitarbeiter', icon: 'ti-user-circle',       label: 'Mitarbeiter' },
  { section: 'Export' },
  { action: 'excel', icon: 'ti-file-spreadsheet', label: 'Export Excel' },
  { action: 'pdf',   icon: 'ti-file-type-pdf',    label: 'Export PDF' },
]

export default function Layout({ activePanel, dbState, dbLabel, onNav, onAction, pageTitle, topbarExtra, children }) {
  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoText}><i className="ti ti-topology-star-3" /> IT Portfolio</div>
          <div className={styles.logoSub}>Demand · Portfolio · Kapazität</div>
        </div>
        <div className={styles.dbStatus}>
          <div className={`${styles.dbDot} ${styles[dbState]}`} />
          <span>{dbLabel}</span>
        </div>
        {NAV.map((item, i) => {
          if (item.section) return <div key={i} className={styles.navSection}>{item.section}</div>
          if (item.action) return (
            <div key={i} className={styles.navItem} onClick={() => onAction(item.action)}>
              <i className={`ti ${item.icon}`} />{item.label}
            </div>
          )
          return (
            <div
              key={i}
              className={`${styles.navItem} ${activePanel === item.panel ? styles.active : ''}`}
              onClick={() => onNav(item.panel)}
            >
              <i className={`ti ${item.icon}`} />{item.label}
            </div>
          )
        })}
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.pageTitle}>{pageTitle}</div>
          <div style={{ display: 'flex', gap: 8 }}>{topbarExtra}</div>
        </header>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}
