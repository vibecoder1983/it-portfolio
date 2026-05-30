import React from 'react'
import { Badge, Card, CardHeader, Metric } from './UI'
import { PHASES, PHASE_COLORS, fmt } from '../lib/constants'

export default function Dashboard({ demands, projects }) {
  const phaseCnt = {}
  PHASES.forEach(p => (phaseCnt[p] = 0))
  projects.forEach(p => { phaseCnt[p.phase] = (phaseCnt[p.phase] || 0) + 1 })

  const open = demands.filter(d => d.status === 'Neu' || d.status === 'In Bewertung').slice(0, 5)
  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0)

  const allDates = projects.flatMap(p => [p.start_date, p.end_date]).filter(Boolean).map(s => new Date(s))
  let horizon = '—'
  if (allDates.length) {
    const mn = Math.min(...allDates.map(d => d.getFullYear()))
    const mx = Math.max(...allDates.map(d => d.getFullYear()))
    horizon = mn === mx ? String(mn) : `${mn}–${mx}`
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <Metric label="Demand gesamt"   value={demands.length}  sub="Vorhaben" />
        <Metric label="Aktive Projekte" value={projects.length} sub="Im Portfolio" />
        <Metric label="Roadmap-Horizont" value={horizon}        sub="Jahre" />
        <Metric label="Budget gesamt"   value={totalBudget > 0 ? (totalBudget / 1_000_000).toFixed(1) + ' Mio €' : '—'} sub="Alle Projekte" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <CardHeader title="Projekte nach Phase" />
          {PHASES.map((ph, i) => (
            <div key={ph} style={{ display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:'0.5px solid var(--border-light)' }}>
              <div style={{ width:10,height:10,borderRadius:2,background:PHASE_COLORS[i],flexShrink:0 }} />
              <span style={{ flex:1,fontSize:13 }}>{ph}</span>
              <span style={{ fontSize:13,fontWeight:500 }}>{phaseCnt[ph] || 0}</span>
            </div>
          ))}
        </Card>

        <Card>
          <CardHeader title="Offene Vorhaben" />
          {open.length ? open.map(d => (
            <div key={d.id} style={{ display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'0.5px solid var(--border-light)' }}>
              <span style={{ flex:1,fontSize:13,fontWeight:500 }}>{d.title}</span>
              <Badge label={d.prio} />
              <Badge label={d.status} />
            </div>
          )) : (
            <div style={{ fontSize:13,color:'var(--text-tertiary)',padding:'8px 0' }}>Alle Vorhaben bewertet</div>
          )}
        </Card>
      </div>
    </div>
  )
}
