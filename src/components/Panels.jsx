import React, { useState, useMemo } from 'react'
import { Badge, Btn, Card, CardHeader, Modal, ModalActions, FormRow, FormGrid, showToast } from './UI'
import { PHASES, MONTHS_SHORT, fmt } from '../lib/constants'
import { sb } from '../lib/supabase'

/* ══════════════════ ROADMAP ══════════════════ */
export function Roadmap({ projects }) {
  const [zoom, setZoom] = useState('month')

  const availableYears = useMemo(() => {
    const years = projects.flatMap(p => [p.start_date, p.end_date]).filter(Boolean).map(s => new Date(s).getFullYear())
    return [...new Set(years)].sort()
  }, [projects])

  const [yearFilter, setYearFilter] = useState('all')

  const filteredProjects = useMemo(() => {
    if (yearFilter === 'all') return projects
    return projects.filter(p => {
      const sy = p.start_date ? new Date(p.start_date).getFullYear() : null
      const ey = p.end_date   ? new Date(p.end_date).getFullYear()   : null
      const y = parseInt(yearFilter)
      return sy === y || ey === y || (sy && ey && sy <= y && ey >= y)
    })
  }, [projects, yearFilter])

  const { cols, minD, totalMs } = useMemo(() => {
    const allDates = filteredProjects.flatMap(p => [p.start_date, p.end_date]).filter(Boolean).map(s => new Date(s))
    if (!allDates.length) return { cols: [], minD: null, totalMs: 1 }
    const mn = new Date(Math.min(...allDates)); mn.setDate(1)
    const mx = new Date(Math.max(...allDates)); mx.setDate(1); mx.setMonth(mx.getMonth()+1)
    const cols = []; const cur = new Date(mn)
    if (zoom === 'quarter') {
      while (cur <= mx) {
        const qStart = new Date(cur); const qEndM = Math.floor(cur.getMonth()/3)*3+3
        cur.setMonth(qEndM); cur.setDate(0); const qEnd = new Date(cur); cur.setDate(cur.getDate()+1)
        cols.push({ label: `Q${Math.floor(qStart.getMonth()/3)+1} ${qStart.getFullYear()}`, start: qStart, end: qEnd }); cur.setDate(2)
      }
    } else {
      while (cur <= mx) {
        const ms = new Date(cur); const me = new Date(cur.getFullYear(), cur.getMonth()+1, 0)
        cols.push({ label: MONTHS_SHORT[ms.getMonth()]+' '+ms.getFullYear(), start: ms, end: me })
        cur.setMonth(cur.getMonth()+1)
      }
    }
    return { cols, minD: mn, totalMs: mx - mn }
  }, [filteredProjects, zoom])

  const pct = d => Math.max(0, Math.min(100, (d - minD) / totalMs * 100))

  // year bands
  const yearBands = useMemo(() => {
    const bands = []; let prevY = null, startPct = 0
    cols.forEach(c => {
      const y = c.start.getFullYear()
      if (y !== prevY) { if (prevY !== null) bands.push({ year: prevY, left: startPct, width: pct(c.start) - startPct }); startPct = pct(c.start); prevY = y }
    })
    if (prevY !== null) bands.push({ year: prevY, left: startPct, width: 100 - startPct })
    return bands
  }, [cols])

  if (!minD) return <Card><div style={{ fontSize:13,color:'var(--text-tertiary)',padding:'8px 0' }}>Keine Projekte vorhanden</div></Card>

  return (
    <Card>
      <CardHeader title="Roadmap — Mehrjahresübersicht">
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{ fontSize:12,padding:'5px 8px',border:'0.5px solid var(--border-mid)',borderRadius:'var(--radius-md)',background:'var(--bg-primary)' }}>
          <option value="all">Alle Jahre</option>
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={zoom} onChange={e => setZoom(e.target.value)} style={{ fontSize:12,padding:'5px 8px',border:'0.5px solid var(--border-mid)',borderRadius:'var(--radius-md)',background:'var(--bg-primary)' }}>
          <option value="month">Monate</option><option value="quarter">Quartale</option>
        </select>
      </CardHeader>
      <div style={{ overflowX:'auto' }}>
        <div style={{ minWidth:800 }}>
          {/* Year row */}
          <div style={{ position:'relative',height:24,marginLeft:150,borderBottom:'0.5px solid var(--border-light)' }}>
            {yearBands.map(b => (
              <div key={b.year} style={{ position:'absolute',left:`${b.left}%`,width:`${b.width}%`,top:0,bottom:0,borderLeft:'2px solid var(--border-strong)',display:'flex',alignItems:'center',paddingLeft:6,fontSize:11,fontWeight:500,color:'var(--text-secondary)' }}>{b.year}</div>
            ))}
          </div>
          {/* Month header */}
          <div style={{ display:'flex',marginLeft:150,borderBottom:'0.5px solid var(--border-light)' }}>
            {cols.map(c => <div key={c.label} style={{ flex:1,minWidth:30,textAlign:'center',fontSize:10,fontWeight:500,color:'var(--text-secondary)',padding:'4px 2px',background:'var(--bg-secondary)',borderRight:'0.5px solid var(--border-light)' }}>{c.label}</div>)}
          </div>
          {/* Bars */}
          <div style={{ marginTop:8 }}>
            {filteredProjects.filter(p => p.start_date && p.end_date).map(p => {
              const l = pct(new Date(p.start_date)).toFixed(2)
              const w = (pct(new Date(p.end_date)) - pct(new Date(p.start_date))).toFixed(2)
              return (
                <div key={p.id} style={{ display:'flex',alignItems:'center',minHeight:36,marginBottom:3 }}>
                  <div style={{ width:150,minWidth:150,fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingRight:8 }}>{p.title}</div>
                  <div style={{ flex:1,position:'relative',minHeight:28 }}>
                    {cols.map((_,i) => <div key={i} style={{ position:'absolute',width:`${100/cols.length}%`,left:`${i*100/cols.length}%`,borderRight:'0.5px solid var(--border-light)',top:0,bottom:0 }} />)}
                    <div style={{ position:'absolute',left:`${l}%`,width:`${w}%`,height:22,top:4,borderRadius:4,background:p.color,display:'flex',alignItems:'center',padding:'0 6px',fontSize:11,fontWeight:500,color:'#fff',overflow:'hidden',whiteSpace:'nowrap',cursor:'pointer' }}
                      title={`${p.title}: ${fmt(p.start_date)} – ${fmt(p.end_date)}`}>{p.title}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  )
}

/* ══════════════════ CAPACITY ══════════════════ */
export function Capacity({ mitarbeiter, assignments }) {
  const years = useMemo(() => {
    const all = [...assignments.flatMap(a => [a.from_date, a.to_date])].filter(Boolean).map(s => new Date(s).getFullYear())
    const set = [...new Set(all)].sort()
    return set.length ? set : [new Date().getFullYear()]
  }, [assignments])

  const [year, setYear] = useState(() => years[years.length - 1] || new Date().getFullYear())

  return (
    <Card>
      <CardHeader title="Kapazitätsplanung — Stunden/Woche">
        <div style={{ display:'flex',gap:10,alignItems:'center' }}>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ fontSize:12,padding:'5px 8px',border:'0.5px solid var(--border-mid)',borderRadius:'var(--radius-md)',background:'var(--bg-primary)' }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {[['#EAF3DE','≤80%'],['#FAEEDA','80–100%'],['#FCEBEB','>100%']].map(([bg,lbl]) => (
            <span key={lbl} style={{ fontSize:11,color:'var(--text-secondary)',display:'flex',alignItems:'center',gap:4 }}>
              <span style={{ display:'inline-block',width:9,height:9,borderRadius:2,background:bg }} />{lbl}
            </span>
          ))}
        </div>
      </CardHeader>

      <div style={{ display:'flex',paddingLeft:140,marginBottom:4 }}>
        {MONTHS_SHORT.map(m => <div key={m} style={{ flex:1,textAlign:'center',fontSize:10,fontWeight:500,color:'var(--text-tertiary)' }}>{m}</div>)}
      </div>

      {mitarbeiter.map(ma => (
        <div key={ma.id} style={{ display:'flex',alignItems:'center',padding:'5px 0',borderBottom:'0.5px solid var(--border-light)',gap:3 }}>
          <div style={{ width:128,minWidth:128 }}>
            <div style={{ fontSize:12,fontWeight:500 }}>{ma.name.split(' ')[0]}</div>
            <div style={{ fontSize:10,color:'var(--text-tertiary)' }}>{ma.name.split(' ')[1]||''} · max {ma.max_h}h</div>
          </div>
          <div style={{ flex:1,display:'flex',gap:3 }}>
            {Array.from({length:12},(_,mi) => {
              const mStart = new Date(year, mi, 1), mEnd = new Date(year, mi+1, 0)
              const total = assignments.filter(a => {
                if (a.ma_id !== ma.id) return false
                const af = a.from_date ? new Date(a.from_date) : null
                const at = a.to_date   ? new Date(a.to_date)   : null
                return af && at && af <= mEnd && at >= mStart
              }).reduce((s, a) => s + (a.hours||0), 0)
              let bg = '#EAF3DE', color = '#27500A'
              if (total > ma.max_h)         { bg = '#FCEBEB'; color = '#791F1F' }
              else if (total > ma.max_h*.8) { bg = '#FAEEDA'; color = '#633806' }
              return <div key={mi} style={{ flex:1 }}><div style={{ height:20,borderRadius:3,background:bg,color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:500 }}>{total ? total+'h' : ''}</div></div>
            })}
          </div>
        </div>
      ))}
    </Card>
  )
}

/* ══════════════════ RESOURCES ══════════════════ */
export function Resources({ assignments, setAssignments, projects, mitarbeiter }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ ma_id:'', proj_id:'', phase:'Preparation', hours:16, from_date:'', to_date:'', note:'' })

  async function save() {
    const payload = { ...form, ma_id: parseInt(form.ma_id), proj_id: parseInt(form.proj_id), hours: parseInt(form.hours)||16, from_date: form.from_date||null, to_date: form.to_date||null }
    const res = await sb.from('assignments').insert(payload).select().single()
    if (res.error) { showToast('Fehler: '+res.error.message, true); return }
    setAssignments(prev => [...prev, res.data])
    showToast('Buchung gespeichert'); setModal(false)
  }

  async function remove(id) {
    const { error } = await sb.from('assignments').delete().eq('id', id)
    if (error) { showToast('Fehler', true); return }
    setAssignments(prev => prev.filter(a => a.id !== id))
    showToast('Buchung entfernt')
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <>
      <Card>
        <CardHeader title="Ressourcenzuweisung — Übersicht">
          <Btn variant="primary" onClick={() => { setForm({ ma_id: mitarbeiter[0]?.id||'', proj_id: projects[0]?.id||'', phase:'Preparation', hours:16, from_date:'', to_date:'', note:'' }); setModal(true) }}>
            <i className="ti ti-plus" /> Buchen
          </Btn>
        </CardHeader>
        <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
          <thead><tr>{['Mitarbeiter','Projekt','Phase','h/Woche','Von','Bis','≈ PT',''].map(h=><th key={h} style={{ textAlign:'left',padding:'8px 10px',fontSize:11,fontWeight:500,color:'var(--text-tertiary)',borderBottom:'0.5px solid var(--border-light)',textTransform:'uppercase' }}>{h}</th>)}</tr></thead>
          <tbody>
            {assignments.map(a => {
              const ma = mitarbeiter.find(m=>m.id===a.ma_id)
              const p  = projects.find(p=>p.id===a.proj_id)
              const days = a.from_date&&a.to_date ? Math.round((new Date(a.to_date)-new Date(a.from_date))/(1000*60*60*24)) : 0
              const pt = Math.round(days/5*(a.hours||0)/8)
              return (
                <tr key={a.id}>
                  <td style={{ padding:'8px 10px',fontWeight:500 }}>{ma?.name||'?'}</td>
                  <td style={{ padding:'8px 10px' }}>{p?.title||'?'}</td>
                  <td style={{ padding:'8px 10px' }}><Badge label={a.phase} /></td>
                  <td style={{ padding:'8px 10px',fontWeight:500 }}>{a.hours}h</td>
                  <td style={{ padding:'8px 10px',fontSize:12 }}>{fmt(a.from_date)}</td>
                  <td style={{ padding:'8px 10px',fontSize:12 }}>{fmt(a.to_date)}</td>
                  <td style={{ padding:'8px 10px',fontSize:12,color:'var(--text-secondary)' }}>≈{pt} PT</td>
                  <td style={{ padding:'8px 10px' }}><Btn variant="danger" size="sm" onClick={()=>remove(a.id)}><i className="ti ti-trash" /></Btn></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={<><i className="ti ti-user-plus" /> Ressource buchen</>}>
        <FormGrid>
          <FormRow label="Mitarbeiter"><select value={form.ma_id} onChange={e=>f('ma_id',e.target.value)}>{mitarbeiter.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></FormRow>
          <FormRow label="Projekt"><select value={form.proj_id} onChange={e=>f('proj_id',e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></FormRow>
        </FormGrid>
        <FormGrid>
          <FormRow label="Phase"><select value={form.phase} onChange={e=>f('phase',e.target.value)}>{PHASES.map(o=><option key={o}>{o}</option>)}</select></FormRow>
          <FormRow label="h/Woche"><input type="number" value={form.hours} onChange={e=>f('hours',e.target.value)} min="1" max="40" /></FormRow>
        </FormGrid>
        <FormGrid>
          <FormRow label="Von"><input type="date" value={form.from_date} onChange={e=>f('from_date',e.target.value)} /></FormRow>
          <FormRow label="Bis"><input type="date" value={form.to_date} onChange={e=>f('to_date',e.target.value)} /></FormRow>
        </FormGrid>
        <FormRow label="Notiz"><input value={form.note} onChange={e=>f('note',e.target.value)} /></FormRow>
        <ModalActions><Btn onClick={()=>setModal(false)}>Abbrechen</Btn><Btn variant="primary" onClick={save}><i className="ti ti-check" /> Buchen</Btn></ModalActions>
      </Modal>
    </>
  )
}

/* ══════════════════ MITARBEITER ══════════════════ */
export function Mitarbeiter({ mitarbeiter, setMitarbeiter, assignments, projects }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name:'', role:'Solution Architect', team:'Backend', max_h:40 })

  async function save() {
    if (!form.name.trim()) return
    const payload = { ...form, max_h: parseInt(form.max_h)||40 }
    const res = await sb.from('mitarbeiter').insert(payload).select().single()
    if (res.error) { showToast('Fehler: '+res.error.message, true); return }
    setMitarbeiter(prev => [...prev, res.data])
    showToast('Mitarbeiter angelegt'); setModal(false); setForm({ name:'', role:'Solution Architect', team:'Backend', max_h:40 })
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <>
      <Card>
        <CardHeader title="Mitarbeiter">
          <Btn variant="primary" onClick={() => setModal(true)}><i className="ti ti-plus" /> Anlegen</Btn>
        </CardHeader>
        <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
          <thead><tr>{['Name','Rolle','Team','Max h/Woche','Projekte'].map(h=><th key={h} style={{ textAlign:'left',padding:'8px 10px',fontSize:11,fontWeight:500,color:'var(--text-tertiary)',borderBottom:'0.5px solid var(--border-light)',textTransform:'uppercase' }}>{h}</th>)}</tr></thead>
          <tbody>
            {mitarbeiter.map(ma => {
              const projs = [...new Set(assignments.filter(a=>a.ma_id===ma.id).map(a=>{ const p=projects.find(x=>x.id===a.proj_id); return p?.title||'?' }))]
              return (
                <tr key={ma.id}>
                  <td style={{ padding:'8px 10px' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                      <div style={{ width:28,height:28,borderRadius:'50%',background:'#E6F1FB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:500,color:'#0C447C' }}>{ma.name.split(' ').map(x=>x[0]).join('')}</div>
                      {ma.name}
                    </div>
                  </td>
                  <td style={{ padding:'8px 10px' }}>{ma.role}</td>
                  <td style={{ padding:'8px 10px' }}><Badge label={ma.team} /></td>
                  <td style={{ padding:'8px 10px' }}>{ma.max_h}h</td>
                  <td style={{ padding:'8px 10px' }}>
                    {projs.slice(0,3).map(t => <span key={t} style={{ display:'inline-flex',background:'var(--bg-secondary)',border:'0.5px solid var(--border-light)',borderRadius:4,padding:'2px 6px',fontSize:11,margin:1 }}>{t}</span>)}
                    {projs.length > 3 && <span style={{ fontSize:11,color:'var(--text-tertiary)' }}> +{projs.length-3}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={<><i className="ti ti-user-plus" /> Mitarbeiter anlegen</>}>
        <FormRow label="Name"><input value={form.name} onChange={e=>f('name',e.target.value)} placeholder="Vor- und Nachname" /></FormRow>
        <FormGrid>
          <FormRow label="Rolle">
            <select value={form.role} onChange={e=>f('role',e.target.value)}>
              {['Solution Architect','Senior Developer','Developer','Projektleiter','Business Analyst','DevOps Engineer','Scrum Master'].map(o=><option key={o}>{o}</option>)}
            </select>
          </FormRow>
          <FormRow label="Team">
            <select value={form.team} onChange={e=>f('team',e.target.value)}>
              {['Backend','Frontend','Infrastruktur','Data & Analytics','PMO'].map(o=><option key={o}>{o}</option>)}
            </select>
          </FormRow>
        </FormGrid>
        <FormRow label="Max Stunden/Woche"><input type="number" value={form.max_h} onChange={e=>f('max_h',e.target.value)} min="4" max="40" /></FormRow>
        <ModalActions><Btn onClick={()=>setModal(false)}>Abbrechen</Btn><Btn variant="primary" onClick={save}><i className="ti ti-check" /> Anlegen</Btn></ModalActions>
      </Modal>
    </>
  )
}
