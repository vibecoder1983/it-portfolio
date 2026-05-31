import React from 'react'
import { Badge, Card, CardHeader } from './UI'
import { PHASES, PHASE_COLORS, D_STATUSES, BADGE_CLASS, MONTHS_SHORT } from '../lib/constants'

const CAT_COLORS = {
  'ERP': '#EF9F27',
  'Data & Analytics': '#1D9E75',
  'Business Applications': '#185FA5',
  'Security': '#E24B4A',
  'Infrastructure': '#B4B2A9',
  'Emerging Technologies': '#534AB7',
}

function SectionTitle({ icon, title }) {
  return (
    <div style={{ display:'flex',alignItems:'center',gap:8,margin:'1.5rem 0 .75rem',borderBottom:'2px solid var(--border-light)',paddingBottom:'.5rem' }}>
      <i className={`ti ${icon}`} style={{ fontSize:16,color:'#185FA5' }} />
      <span style={{ fontSize:14,fontWeight:600,color:'var(--text-primary)',letterSpacing:'.02em' }}>{title}</span>
    </div>
  )
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{ background:'var(--bg-primary)',border:'0.5px solid var(--border-light)',borderRadius:'var(--radius-lg)',padding:'1rem 1.25rem' }}>
      <div style={{ fontSize:10,fontWeight:500,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:22,fontWeight:700,color: color || 'var(--text-primary)',lineHeight:1.1 }}>{value}</div>
      {sub && <div style={{ fontSize:11,color:'var(--text-tertiary)',marginTop:3 }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard({ demands, projects }) {

  /* ── Demand KPIs ── */
  const dNeu        = demands.filter(d => d.status === 'Neu').length
  const dBewertung  = demands.filter(d => d.status === 'In Bewertung').length
  const dFreigabe   = demands.filter(d => d.status === 'Freigegeben').length
  const dAbgelehnt  = demands.filter(d => d.status === 'Abgelehnt').length
  const openDemands = demands.filter(d => d.status === 'Neu' || d.status === 'In Bewertung')

  const statusCount = D_STATUSES.map(s => ({ s, count: demands.filter(d => d.status === s).length }))

  /* ── Portfolio KPIs ── */
  const activeProjects     = projects.filter(p => !p.abgeschlossen)
  const twelveMonthsAgo    = new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)
  const completedProjects  = projects.filter(p => p.abgeschlossen && p.end_date && new Date(p.end_date) >= twelveMonthsAgo)

  const phaseCnt = {}
  PHASES.forEach(p => (phaseCnt[p] = 0))
  activeProjects.forEach(p => { phaseCnt[p.phase] = (phaseCnt[p.phase] || 0) + 1 })

  const totalBudget   = activeProjects.reduce((s, p) => s + (p.budget || 0), 0)
  const avgProgress   = activeProjects.length ? Math.round(activeProjects.reduce((s, p) => s + (p.progress || 0), 0) / activeProjects.length) : 0

  const allDates = activeProjects.flatMap(p => [p.start_date, p.end_date]).filter(Boolean).map(s => new Date(s))
  let horizon = '—'
  if (allDates.length) {
    const mn = Math.min(...allDates.map(d => d.getFullYear()))
    const mx = Math.max(...allDates.map(d => d.getFullYear()))
    horizon = mn === mx ? String(mn) : `${mn}–${mx}`
  }

  const catCnt = {}
  projects.forEach(p => { catCnt[p.cat] = (catCnt[p.cat]||0) + 1 })
  const catEntries = Object.entries(catCnt).sort((a,b) => b[1]-a[1])

  // 12-Monats-Fenster: 10 Monate zurück + aktueller + 1 voraus
  const now = new Date()
  const last12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 10 + i, 1)
    return { year: d.getFullYear(), month: d.getMonth(), label: MONTHS_SHORT[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2) }
  })

  // Nur abgeschlossene Projekte, gruppiert nach end_date
  const projectsByMonth = last12.map(({ year, month }) => ({
    year, month,
    items: projects.filter(p => {
      if (!p.abgeschlossen || !p.end_date) return false
      const d = new Date(p.end_date)
      return d.getFullYear() === year && d.getMonth() === month
    })
  }))
  const maxPerMonth = Math.max(1, ...projectsByMonth.map(m => m.items.length))

  return (
    <div>

      {/* ══ DEMAND SECTION ══ */}
      <SectionTitle icon="ti-inbox" title="Demand" />

      {/* Demand Metrics */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:'1rem' }}>
        <MetricCard label="Demand gesamt"   value={demands.length}  sub="Alle Vorhaben" />
        <MetricCard label="Neu"             value={dNeu}            sub="Offen"           color={dNeu      ? '#185FA5' : undefined} />
        <MetricCard label="In Bewertung"    value={dBewertung}      sub="In Prüfung"      color={dBewertung? '#EF9F27' : undefined} />
        <MetricCard label="Freigegeben"     value={dFreigabe}       sub="Bereit"          color={dFreigabe ? '#1D9E75' : undefined} />
      </div>

      {/* Demand Detail */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'0.5rem' }}>
        <Card>
          <CardHeader title="Offene Vorhaben" />
          {openDemands.length ? openDemands.map(d => (
            <div key={d.id} style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'0.5px solid var(--border-light)' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:500 }}>{d.title}</div>
                {d.req && <div style={{ fontSize:11,color:'var(--text-tertiary)' }}>{d.req}</div>}
              </div>
              <Badge label={d.prio} />
              <Badge label={d.status} />
            </div>
          )) : (
            <div style={{ fontSize:13,color:'var(--text-tertiary)',padding:'8px 0' }}>Alle Vorhaben bewertet</div>
          )}
        </Card>

        <Card>
          <CardHeader title="Vorhaben nach Status" />
          {statusCount.map(({ s, count }) => (
            <div key={s} style={{ display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:'0.5px solid var(--border-light)' }}>
              <span className={`badge b-${BADGE_CLASS[s]?.replace('b-','')}`} style={{ fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--bg-secondary)',border:'0.5px solid var(--border-light)',display:'inline-block' }}>{s}</span>
              <div style={{ flex:1,background:'var(--bg-secondary)',borderRadius:4,height:6 }}>
                <div style={{ width: demands.length ? `${count/demands.length*100}%` : '0%', height:6, borderRadius:4, background:'#185FA5' }} />
              </div>
              <span style={{ fontSize:13,fontWeight:500,minWidth:16,textAlign:'right' }}>{count}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* ══ PORTFOLIO SECTION ══ */}
      <SectionTitle icon="ti-briefcase" title="IT Portfolio" />

      {/* Portfolio Metrics */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:'1rem' }}>
        <MetricCard label="Aktive Projekte"       value={activeProjects.length}    sub="Laufende Projekte" />
        <MetricCard label="Abgeschlossen"         value={completedProjects.length} sub="Letzte 12 Monate" color={completedProjects.length > 0 ? '#1D9E75' : undefined} />
        <MetricCard label="Budget gesamt"         value={totalBudget > 0 ? (totalBudget/1_000_000).toFixed(1)+' Mio €' : '—'} sub="Laufende Projekte" />
        <MetricCard label="Ø Fortschritt"         value={avgProgress+'%'}  sub="Laufende Projekte" color={avgProgress > 75 ? '#1D9E75' : avgProgress > 40 ? '#EF9F27' : undefined} />
        <MetricCard label="Roadmap-Horizont"      value={horizon}          sub="Jahre" />
      </div>

      {/* Portfolio Detail */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem' }}>
        <Card>
          <CardHeader title="Projekte nach Phase" />
          {PHASES.map((ph, i) => (
            <div key={ph} style={{ display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:'0.5px solid var(--border-light)' }}>
              <div style={{ width:10,height:10,borderRadius:2,background:PHASE_COLORS[i],flexShrink:0 }} />
              <span style={{ flex:1,fontSize:13 }}>{ph}</span>
              <div style={{ width:80,background:'var(--bg-secondary)',borderRadius:4,height:6 }}>
                <div style={{ width: projects.length ? `${(phaseCnt[ph]||0)/projects.length*100}%` : '0%', height:6, borderRadius:4, background:PHASE_COLORS[i] }} />
              </div>
              <span style={{ fontSize:13,fontWeight:500,minWidth:16,textAlign:'right' }}>{phaseCnt[ph] || 0}</span>
            </div>
          ))}
        </Card>

        <Card>
          <CardHeader title="Projekte nach Kategorie" />
          {catEntries.length ? catEntries.map(([cat, count]) => (
            <div key={cat} style={{ display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:'0.5px solid var(--border-light)' }}>
              <div style={{ width:10,height:10,borderRadius:2,background:CAT_COLORS[cat]||'#B4B2A9',flexShrink:0 }} />
              <span style={{ flex:1,fontSize:13 }}>{cat}</span>
              <div style={{ width:80,background:'var(--bg-secondary)',borderRadius:4,height:6 }}>
                <div style={{ width:`${count/projects.length*100}%`,height:6,borderRadius:4,background:CAT_COLORS[cat]||'#B4B2A9' }} />
              </div>
              <span style={{ fontSize:13,fontWeight:500,minWidth:16,textAlign:'right' }}>{count}</span>
            </div>
          )) : (
            <div style={{ fontSize:13,color:'var(--text-tertiary)',padding:'8px 0' }}>Keine Projekte vorhanden</div>
          )}
        </Card>

      </div>

      {/* Projektabschlüsse Tabelle */}
      <Card style={{ marginTop:'1rem' }}>
        <CardHeader title="Projektabschlüsse — Letzte 12 Monate" />
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr>
                {['Monat','Projekt','Kategorie','Budget (€)','Fortschritt','Status'].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'8px 10px', fontSize:11, fontWeight:500, color:'var(--text-tertiary)', borderBottom:'0.5px solid var(--border-light)', textTransform:'uppercase', letterSpacing:'.05em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rows = []
                last12.forEach(({ year, month, label }) => {
                  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
                  const monthProjects = projects.filter(p => {
                    if (!p.end_date) return false
                    const d = new Date(p.end_date)
                    return d.getFullYear() === year && d.getMonth() === month
                  })
                  if (monthProjects.length === 0) {
                    rows.push(
                      <tr key={`${year}-${month}`} style={{ borderBottom:'0.5px solid var(--border-light)', background: isCurrentMonth ? '#F0F6FF' : 'transparent' }}>
                        <td style={{ padding:'8px 10px', fontWeight: isCurrentMonth ? 600 : 400, color: isCurrentMonth ? '#185FA5' : 'var(--text-secondary)', whiteSpace:'nowrap' }}>{label}</td>
                        <td colSpan={5} style={{ padding:'8px 10px', color:'var(--text-tertiary)', fontSize:12 }}>—</td>
                      </tr>
                    )
                  } else {
                    monthProjects.forEach((p, pi) => {
                      rows.push(
                        <tr key={`${year}-${month}-${p.id}`} style={{ borderBottom:'0.5px solid var(--border-light)', background: isCurrentMonth ? '#F0F6FF' : p.abgeschlossen ? '#F6FBF0' : 'transparent' }}>
                          {pi === 0 && (
                            <td rowSpan={monthProjects.length} style={{ padding:'8px 10px', fontWeight: isCurrentMonth ? 600 : 500, color: isCurrentMonth ? '#185FA5' : 'var(--text-secondary)', verticalAlign:'top', whiteSpace:'nowrap', borderRight:'0.5px solid var(--border-light)' }}>{label}</td>
                          )}
                          <td style={{ padding:'8px 10px', fontWeight:500 }}>{p.title}</td>
                          <td style={{ padding:'8px 10px' }}><Badge label={p.cat} /></td>
                          <td style={{ padding:'8px 10px', fontSize:12 }}>{p.budget ? p.budget.toLocaleString('de-DE') + ' €' : '—'}</td>
                          <td style={{ padding:'8px 10px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <div style={{ width:60, background:'var(--bg-secondary)', borderRadius:3, height:5 }}>
                                <div style={{ width:`${p.progress||0}%`, height:5, borderRadius:3, background: p.abgeschlossen ? '#1D9E75' : p.color }} />
                              </div>
                              <span style={{ fontSize:11 }}>{p.progress||0}%</span>
                            </div>
                          </td>
                          <td style={{ padding:'8px 10px' }}>
                            {p.abgeschlossen
                              ? <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:500, color:'#1D9E75' }}><i className="ti ti-circle-check" /> Abgeschlossen</span>
                              : <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:500, color:'#EF9F27' }}><i className="ti ti-clock" /> In Bearbeitung</span>
                            }
                          </td>
                        </tr>
                      )
                    })
                  }
                })
                return rows
              })()}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  )
}
