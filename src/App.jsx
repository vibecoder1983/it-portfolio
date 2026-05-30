import React, { useState, useEffect, useCallback } from 'react'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import Demand from './components/Demand'
import Portfolio from './components/Portfolio'
import { Roadmap, Capacity, Resources, Mitarbeiter } from './components/Panels'
import { showToast } from './components/UI'
import { sb } from './lib/supabase'
import { PROJ_COLORS } from './lib/constants'
import * as XLSX from 'xlsx'

const PAGE_TITLES = {
  dashboard: 'Dashboard', demand: 'Demand-Backlog', portfolio: 'IT-Portfolio',
  roadmap: 'Roadmap', capacity: 'Kapazitätsplanung', resources: 'Ressourcenzuweisung', mitarbeiter: 'Mitarbeiter',
}

export default function App() {
  const [panel, setPanel]           = useState('dashboard')
  const [demands, setDemands]       = useState([])
  const [projects, setProjects]     = useState([])
  const [mitarbeiter, setMitarbeiter] = useState([])
  const [assignments, setAssignments] = useState([])
  const [dbState, setDbState]       = useState('loading')
  const [dbLabel, setDbLabel]       = useState('Verbinde...')

  const loadAll = useCallback(async () => {
    setDbState('loading'); setDbLabel('Lädt...')
    try {
      const [d, p, m, a] = await Promise.all([
        sb.from('demands').select('*').order('id'),
        sb.from('projects').select('*').order('id'),
        sb.from('mitarbeiter').select('*').order('id'),
        sb.from('assignments').select('*').order('id'),
      ])
      if (d.error||p.error||m.error||a.error) throw d.error||p.error||m.error||a.error
      setDemands(d.data||[])
      setProjects((p.data||[]).map((proj, i) => ({ ...proj, milestones: proj.milestones||[], color: proj.color||PROJ_COLORS[i % PROJ_COLORS.length] })))
      setMitarbeiter(m.data||[])
      setAssignments(a.data||[])
      setDbState('ok'); setDbLabel('Verbunden')
    } catch(e) {
      setDbState('err'); setDbLabel('Verbindungsfehler')
      showToast('Datenbankfehler: ' + (e.message||e), true)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  async function promoteToPortfolio(demandId) {
    const d = demands.find(x => x.id === demandId)
    if (!d) return
    const color = PROJ_COLORS[projects.length % PROJ_COLORS.length]
    const payload = {
      title: d.title, cat: 'Sonstiges', phase: 'Preparation',
      start_date: d.start_date || null, end_date: null,
      budget: d.budget || 0, progress: 0,
      pm_it: '', pm_biz: d.req || '',
      color, milestones: [],
    }
    const res = await sb.from('projects').insert(payload).select().single()
    if (res.error) { showToast('Fehler: ' + res.error.message, true); return }
    const { error: delErr } = await sb.from('demands').delete().eq('id', demandId)
    if (delErr) { showToast('Fehler beim Löschen des Demands', true); return }
    setProjects(prev => [...prev, { ...res.data, milestones: [] }])
    setDemands(prev => prev.filter(x => x.id !== demandId))
    showToast('Demand ins Portfolio übernommen')
  }

  async function demoteToBacklog(projectId) {
    const p = projects.find(x => x.id === projectId)
    if (!p) return
    const payload = {
      title: p.title, req: p.pm_biz || '', prio: 'Hoch', val: 'Hoch',
      effort: 0, budget: p.budget || 0,
      start_date: p.start_date || null, description: '',
      status: 'In Bewertung',
    }
    const res = await sb.from('demands').insert(payload).select().single()
    if (res.error) { showToast('Fehler: ' + res.error.message, true); return }
    const { error: delErr } = await sb.from('projects').delete().eq('id', projectId)
    if (delErr) { showToast('Fehler beim Löschen des Projekts', true); return }
    setDemands(prev => [...prev, res.data])
    setProjects(prev => prev.filter(x => x.id !== projectId))
    showToast('Projekt zurück in den Demand-Backlog verschoben')
  }

  function exportExcel() {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Titel','Antragsteller','Priorität','Wert','Aufwand PT','Budget €','Status','Beschreibung','Wunschstart'],
      ...demands.map(d=>[d.title,d.req,d.prio,d.val,d.effort,d.budget,d.status,d.description,d.start_date])
    ]), 'Demand')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Projekt','Kategorie','Phase','Start','Ende','Budget €','%','PL IT','PL Business'],
      ...projects.map(p=>[p.title,p.cat,p.phase,p.start_date,p.end_date,p.budget,p.progress,p.pm_it,p.pm_biz])
    ]), 'Portfolio')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Mitarbeiter','Projekt','Phase','h/Woche','Von','Bis','Notiz'],
      ...assignments.map(a=>{ const ma=mitarbeiter.find(m=>m.id===a.ma_id); const p=projects.find(x=>x.id===a.proj_id); return [ma?.name||'?',p?.title||'?',a.phase,a.hours,a.from_date,a.to_date,a.note||''] })
    ]), 'Ressourcen')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Name','Rolle','Team','Max h/Woche'],
      ...mitarbeiter.map(m=>[m.name,m.role,m.team,m.max_h])
    ]), 'Mitarbeiter')
    XLSX.writeFile(wb, 'IT_Portfolio_Export.xlsx')
  }

  function exportPDF() {
    const w = window.open('','_blank')
    const now = new Date().toLocaleDateString('de-DE')
    const fmt = s => s ? new Date(s).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—'
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>IT Portfolio ${now}</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;padding:30px}h1{font-size:20px}h2{font-size:14px;margin:20px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px}table{width:100%;border-collapse:collapse;margin-bottom:14px}th{background:#f0f4f8;text-align:left;padding:6px 8px;font-size:10px;border:1px solid #ddd}td{padding:5px 8px;border:1px solid #eee;font-size:11px}</style>
    </head><body>
    <h1>IT Portfolio Report</h1><p style="color:#666;font-size:11px">Erstellt: ${now}</p>
    <h2>Portfolio</h2><table><thead><tr><th>Projekt</th><th>Phase</th><th>Start</th><th>Ende</th><th>Budget</th><th>%</th><th>PL IT</th><th>PL Biz</th></tr></thead><tbody>
    ${projects.map(p=>`<tr><td>${p.title}</td><td>${p.phase}</td><td>${fmt(p.start_date)}</td><td>${fmt(p.end_date)}</td><td>${p.budget?p.budget.toLocaleString('de-DE')+' €':'—'}</td><td>${p.progress||0}%</td><td>${p.pm_it||'—'}</td><td>${p.pm_biz||'—'}</td></tr>`).join('')}
    </tbody></table>
    <h2>Demand</h2><table><thead><tr><th>Vorhaben</th><th>Antragsteller</th><th>Priorität</th><th>Budget</th><th>PT</th><th>Status</th></tr></thead><tbody>
    ${demands.map(d=>`<tr><td>${d.title}</td><td>${d.req||'—'}</td><td>${d.prio}</td><td>${d.budget?d.budget.toLocaleString('de-DE'):'-'}</td><td>${d.effort||0}</td><td>${d.status}</td></tr>`).join('')}
    </tbody></table></body></html>`)
    w.document.close(); setTimeout(()=>w.print(), 400)
  }

  const topbarExtra = (
    <>
      <button onClick={loadAll} style={{ display:'inline-flex',alignItems:'center',gap:5,fontSize:12,padding:'6px 12px',borderRadius:'var(--radius-md)',border:'0.5px solid var(--border-mid)',background:'var(--bg-primary)',cursor:'pointer',fontFamily:'var(--font)' }} title="Daten neu laden">
        <i className="ti ti-refresh" />
      </button>
      <button onClick={() => {}} style={{ display:'inline-flex',alignItems:'center',gap:5,fontSize:12,padding:'6px 12px',borderRadius:'var(--radius-md)',border:'none',background:'#185FA5',color:'#fff',cursor:'pointer',fontFamily:'var(--font)' }}
        onClick={() => {
          if (panel === 'demand') document.dispatchEvent(new CustomEvent('open-demand-modal'))
          else if (panel === 'portfolio') document.dispatchEvent(new CustomEvent('open-proj-modal'))
          else if (panel === 'mitarbeiter') document.dispatchEvent(new CustomEvent('open-ma-modal'))
        }}>
        <i className="ti ti-plus" /> Neu
      </button>
    </>
  )

  return (
    <Layout
      activePanel={panel} dbState={dbState} dbLabel={dbLabel}
      onNav={setPanel}
      onAction={a => { if (a==='excel') exportExcel(); if (a==='pdf') exportPDF() }}
      pageTitle={PAGE_TITLES[panel] || panel}
      topbarExtra={topbarExtra}
    >
      {panel === 'dashboard'   && <Dashboard demands={demands} projects={projects} />}
      {panel === 'demand'      && <Demand demands={demands} setDemands={setDemands} onPromote={promoteToPortfolio} />}
      {panel === 'portfolio'   && <Portfolio projects={projects} setProjects={setProjects} mitarbeiter={mitarbeiter} assignments={assignments} setAssignments={setAssignments} onDemote={demoteToBacklog} />}
      {panel === 'roadmap'     && <Roadmap projects={projects} />}
      {panel === 'capacity'    && <Capacity mitarbeiter={mitarbeiter} assignments={assignments} />}
      {panel === 'resources'   && <Resources assignments={assignments} setAssignments={setAssignments} projects={projects} mitarbeiter={mitarbeiter} />}
      {panel === 'mitarbeiter' && <Mitarbeiter mitarbeiter={mitarbeiter} setMitarbeiter={setMitarbeiter} assignments={assignments} projects={projects} />}
    </Layout>
  )
}
