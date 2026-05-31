import React, { useState } from 'react'
import { Badge, Btn, Card, CardHeader, Modal, ModalActions, FormRow, FormGrid, showToast } from './UI'
import { PHASES, PHASE_COLORS, PHASE_ICONS, PROJ_COLORS, fmt } from '../lib/constants'
import { sb } from '../lib/supabase'

const EMPTY_PROJ = { title:'', cat:'ERP', phase:'Preparation', start_date:'', end_date:'', budget:'', progress:0, pm_it:'', pm_biz:'' }

/* ── Phase Stepper ── */
function PhaseStepper({ phase, onSet }) {
  const idx = PHASES.indexOf(phase)
  return (
    <div style={{ display:'flex',borderRadius:'var(--radius-lg)',overflow:'hidden',border:'0.5px solid var(--border-light)',marginBottom:'.5rem' }}>
      {PHASES.map((ph, i) => {
        let bg = 'var(--bg-secondary)', color = 'var(--text-tertiary)'
        if (i < idx) { bg = '#EAF3DE'; color = '#27500A' }
        if (i === idx) { bg = '#185FA5'; color = '#fff' }
        return (
          <div key={ph} onClick={() => onSet(ph)}
            style={{ flex:1,padding:'9px 4px',textAlign:'center',fontSize:10,fontWeight:500,cursor:'pointer',borderRight: i<4 ? '0.5px solid var(--border-light)':'none',display:'flex',flexDirection:'column',alignItems:'center',gap:3,background:bg,color,transition:'background .15s' }}>
            <i className={`ti ${PHASE_ICONS[i]}`} style={{ fontSize:13 }} />
            <span>{ph}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Project Detail ── */
function ProjectDetail({ project, mitarbeiter, assignments, setAssignments, setProjects, onBack }) {
  const [msModal, setMsModal] = useState(false)
  const [assignModal, setAssignModal] = useState(false)
  const [msForm, setMsForm] = useState({ title:'', date:'', status:'Offen', phase:'Preparation' })
  const [aForm, setAForm]   = useState({ ma_id:'', phase:'Preparation', hours:16, from_date:'', to_date:'', note:'' })

  const res = assignments.filter(a => a.proj_id === project.id)
  const phIdx = PHASES.indexOf(project.phase)

  async function setPhase(ph) {
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, phase: ph } : p))
    const { error } = await sb.from('projects').update({ phase: ph }).eq('id', project.id)
    if (error) { showToast('Fehler', true); setProjects(prev => prev.map(p => p.id === project.id ? { ...p, phase: project.phase } : p)) }
    else showToast('Phase aktualisiert')
  }

  async function saveMilestone() {
    if (!msForm.title) return
    const newMs = [...(project.milestones||[]), msForm]
    const { error } = await sb.from('projects').update({ milestones: newMs }).eq('id', project.id)
    if (error) { showToast('Fehler', true); return }
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, milestones: newMs } : p))
    showToast('Meilenstein gespeichert')
    setMsModal(false)
  }

  async function saveAssign() {
    const payload = { ...aForm, ma_id: parseInt(aForm.ma_id), proj_id: project.id, hours: parseInt(aForm.hours)||16, from_date: aForm.from_date||null, to_date: aForm.to_date||null }
    const res2 = await sb.from('assignments').insert(payload).select().single()
    if (res2.error) { showToast('Fehler: '+res2.error.message, true); return }
    setAssignments(prev => [...prev, res2.data])
    showToast('Buchung gespeichert')
    setAssignModal(false)
  }

  async function removeAssign(id) {
    const { error } = await sb.from('assignments').delete().eq('id', id)
    if (error) { showToast('Fehler', true); return }
    setAssignments(prev => prev.filter(a => a.id !== id))
    showToast('Buchung entfernt')
  }

  const currentProject = project

  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:'1.25rem' }}>
        <Btn onClick={onBack}><i className="ti ti-arrow-left" /> Zurück</Btn>
        <div style={{ fontSize:16,fontWeight:500 }}>{currentProject.title}</div>
        <Badge label={currentProject.phase} />
      </div>

      <PhaseStepper phase={currentProject.phase} onSet={setPhase} />
      <div style={{ fontSize:11,color:'var(--text-tertiary)',marginBottom:'1rem',textAlign:'center' }}>Klicken Sie auf eine Phase, um das Projekt dorthin zu versetzen</div>

      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1rem' }}>
        <div style={{ background:'var(--bg-primary)',border:'0.5px solid var(--border-light)',borderRadius:'var(--radius-lg)',padding:'1.25rem' }}>
          <div style={{ fontSize:14,fontWeight:500,marginBottom:'.75rem' }}>Projektinfo</div>
          <table style={{ fontSize:13,width:'100%' }}>
            {[
              ['Kategorie', <Badge key="c" label={currentProject.cat||'—'} />],
              ['Projektstart', <strong key="s">{fmt(currentProject.start_date)}</strong>],
              ['Projektende',  <strong key="e">{fmt(currentProject.end_date)}</strong>],
              ['PL IT',        <strong key="pit">{currentProject.pm_it||'—'}</strong>],
              ['PL Business',  <strong key="pb">{currentProject.pm_biz||'—'}</strong>],
              ['Budget',       <strong key="b">{currentProject.budget?currentProject.budget.toLocaleString('de-DE')+' €':'—'}</strong>],
            ].map(([label, val]) => (
              <tr key={label}><td style={{ color:'var(--text-secondary)',padding:'5px 0',width:130 }}>{label}</td><td>{val}</td></tr>
            ))}
            <tr>
              <td style={{ color:'var(--text-secondary)',padding:'5px 0' }}>Fortschritt</td>
              <td>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <div style={{ flex:1,background:'var(--bg-secondary)',borderRadius:4,height:6 }}>
                    <div style={{ width:`${currentProject.progress||0}%`,height:6,borderRadius:4,background:currentProject.color }} />
                  </div>
                  <strong>{currentProject.progress||0}%</strong>
                </div>
              </td>
            </tr>
          </table>
        </div>

        <div style={{ background:'var(--bg-primary)',border:'0.5px solid var(--border-light)',borderRadius:'var(--radius-lg)',padding:'1.25rem' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.75rem' }}>
            <div style={{ fontSize:14,fontWeight:500 }}>Meilensteine</div>
            <Btn size="sm" onClick={() => setMsModal(true)}><i className="ti ti-plus" /> Hinzufügen</Btn>
          </div>
          {(currentProject.milestones||[]).length ? [...(currentProject.milestones||[])].sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map((ms,i) => (
            <div key={i} style={{ display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:'0.5px solid var(--border-light)' }}>
              <div style={{ width:10,height:10,borderRadius:'50%',flexShrink:0,background: ms.status==='Erreicht'?'#639922':ms.status==='Verzögert'?'#E24B4A':ms.status==='In Arbeit'?'#EF9F27':'#B4B2A9' }} />
              <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:500 }}>{ms.title}</div><div style={{ fontSize:11,color:'var(--text-tertiary)' }}>{ms.phase} · {fmt(ms.date)}</div></div>
              <Badge label={ms.status} />
            </div>
          )) : <div style={{ fontSize:13,color:'var(--text-tertiary)',padding:'8px 0' }}>Noch keine Meilensteine</div>}
        </div>
      </div>

      <div style={{ background:'var(--bg-primary)',border:'0.5px solid var(--border-light)',borderRadius:'var(--radius-lg)',padding:'1.25rem',marginBottom:'1rem' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.75rem' }}>
          <div style={{ fontSize:14,fontWeight:500 }}>Ressourcenzuweisung</div>
          <Btn size="sm" onClick={() => { setAForm({ ma_id: mitarbeiter[0]?.id||'', phase:'Preparation', hours:16, from_date:'', to_date:'', note:'' }); setAssignModal(true) }}><i className="ti ti-user-plus" /> Buchen</Btn>
        </div>
        {res.length ? (
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
            <thead><tr>{['Mitarbeiter','Phase','h/Woche','Von','Bis','Notiz',''].map(h=><th key={h} style={{ textAlign:'left',padding:'6px 8px',fontSize:11,fontWeight:500,color:'var(--text-tertiary)',borderBottom:'0.5px solid var(--border-light)',textTransform:'uppercase' }}>{h}</th>)}</tr></thead>
            <tbody>{res.map(a => { const ma=mitarbeiter.find(m=>m.id===a.ma_id); return (
              <tr key={a.id}><td style={{ padding:'7px 8px',fontWeight:500 }}>{ma?.name||'?'}</td><td style={{ padding:'7px 8px' }}><Badge label={a.phase} /></td><td style={{ padding:'7px 8px',fontWeight:500 }}>{a.hours}h</td><td style={{ padding:'7px 8px',fontSize:12 }}>{fmt(a.from_date)}</td><td style={{ padding:'7px 8px',fontSize:12 }}>{fmt(a.to_date)}</td><td style={{ padding:'7px 8px',fontSize:11,color:'var(--text-tertiary)' }}>{a.note}</td><td style={{ padding:'7px 8px' }}><Btn variant="danger" size="sm" onClick={() => removeAssign(a.id)}><i className="ti ti-trash" /></Btn></td></tr>
            )})}</tbody>
          </table>
        ) : <div style={{ fontSize:13,color:'var(--text-tertiary)',padding:'8px 0' }}>Noch keine Ressourcen gebucht</div>}
      </div>

      {/* Milestone modal */}
      <Modal open={msModal} onClose={() => setMsModal(false)} title={<><i className="ti ti-flag" /> Meilenstein</>}>
        <FormRow label="Bezeichnung"><input value={msForm.title} onChange={e => setMsForm(p=>({...p,title:e.target.value}))} /></FormRow>
        <FormGrid>
          <FormRow label="Datum"><input type="date" value={msForm.date} onChange={e => setMsForm(p=>({...p,date:e.target.value}))} /></FormRow>
          <FormRow label="Status"><select value={msForm.status} onChange={e => setMsForm(p=>({...p,status:e.target.value}))}>{['Offen','In Arbeit','Erreicht','Verzögert'].map(o=><option key={o}>{o}</option>)}</select></FormRow>
        </FormGrid>
        <FormRow label="Phase"><select value={msForm.phase} onChange={e => setMsForm(p=>({...p,phase:e.target.value}))}>{PHASES.map(o=><option key={o}>{o}</option>)}</select></FormRow>
        <ModalActions><Btn onClick={()=>setMsModal(false)}>Abbrechen</Btn><Btn variant="primary" onClick={saveMilestone}><i className="ti ti-check" /> Speichern</Btn></ModalActions>
      </Modal>

      {/* Assign modal */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)} title={<><i className="ti ti-user-plus" /> Mitarbeiter buchen</>}>
        <FormRow label="Mitarbeiter"><select value={aForm.ma_id} onChange={e => setAForm(p=>({...p,ma_id:e.target.value}))}>{mitarbeiter.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></FormRow>
        <FormGrid>
          <FormRow label="Phase"><select value={aForm.phase} onChange={e => setAForm(p=>({...p,phase:e.target.value}))}>{PHASES.map(o=><option key={o}>{o}</option>)}</select></FormRow>
          <FormRow label="h/Woche"><input type="number" value={aForm.hours} onChange={e => setAForm(p=>({...p,hours:e.target.value}))} min="1" max="40" /></FormRow>
        </FormGrid>
        <FormGrid>
          <FormRow label="Von"><input type="date" value={aForm.from_date} onChange={e => setAForm(p=>({...p,from_date:e.target.value}))} /></FormRow>
          <FormRow label="Bis"><input type="date" value={aForm.to_date} onChange={e => setAForm(p=>({...p,to_date:e.target.value}))} /></FormRow>
        </FormGrid>
        <FormRow label="Notiz"><input value={aForm.note} onChange={e => setAForm(p=>({...p,note:e.target.value}))} /></FormRow>
        <ModalActions><Btn onClick={()=>setAssignModal(false)}>Abbrechen</Btn><Btn variant="primary" onClick={saveAssign}><i className="ti ti-check" /> Buchen</Btn></ModalActions>
      </Modal>
    </div>
  )
}

/* ── Portfolio List ── */
export default function Portfolio({ projects, setProjects, mitarbeiter, assignments, setAssignments, onDemote }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_PROJ)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState(null)

  const currentProject = detail ? projects.find(p => p.id === detail) : null

  if (currentProject) return (
    <ProjectDetail
      project={currentProject} mitarbeiter={mitarbeiter}
      assignments={assignments} setAssignments={setAssignments}
      setProjects={setProjects} onBack={() => setDetail(null)}
    />
  )

  function openEdit(p) {
    setForm({ title:p.title, cat:p.cat, phase:p.phase, start_date:p.start_date||'', end_date:p.end_date||'', budget:p.budget||'', progress:p.progress||0, pm_it:p.pm_it||'', pm_biz:p.pm_biz||'' })
    setEditId(p.id); setModal(true)
  }
  function openNew() { setForm(EMPTY_PROJ); setEditId(null); setModal(true) }
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = { ...form, budget: parseInt(form.budget)||0, progress: parseInt(form.progress)||0, start_date: form.start_date||null, end_date: form.end_date||null }
    let error
    if (editId) {
      ;({ error } = await sb.from('projects').update(payload).eq('id', editId))
      if (!error) setProjects(prev => prev.map(p => p.id === editId ? { ...p, ...payload } : p))
    } else {
      payload.color = PROJ_COLORS[projects.length % PROJ_COLORS.length]
      payload.milestones = []
      const res = await sb.from('projects').insert(payload).select().single()
      error = res.error; if (!error) setProjects(prev => [...prev, res.data])
    }
    setSaving(false)
    if (error) { showToast('Fehler: ' + error.message, true); return }
    showToast('Projekt gespeichert'); setModal(false)
  }

  return (
    <>
      <Card>
        <CardHeader title="IT-Portfolio">
          <Btn variant="primary" onClick={openNew}><i className="ti ti-plus" /> Projekt anlegen</Btn>
        </CardHeader>

        {projects.map(p => {
          const phIdx = PHASES.indexOf(p.phase)
          const res = assignments.filter(a => a.proj_id === p.id)
          return (
            <div key={p.id} onClick={() => setDetail(p.id)}
              style={{ background:'var(--bg-primary)',border:'0.5px solid var(--border-light)',borderRadius:'var(--radius-lg)',padding:'1rem',marginBottom:'.75rem',cursor:'pointer',transition:'border-color .15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='var(--border-strong)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--border-light)'}
            >
              <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8 }}>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <div style={{ width:10,height:10,borderRadius:'50%',background:p.color,flexShrink:0,marginTop:2 }} />
                  <div>
                    <div style={{ fontSize:13,fontWeight:500 }}>{p.title}</div>
                    <div style={{ fontSize:11,color:'var(--text-tertiary)' }}>IT: {p.pm_it||'—'} · Biz: {p.pm_biz||'—'}</div>
                  </div>
                </div>
                <div style={{ display:'flex',gap:6,alignItems:'center' }}>
                  <Badge label={p.phase} />
                  <Btn size="sm" onClick={e => { e.stopPropagation(); openEdit(p) }}><i className="ti ti-edit" /></Btn>
                  <Btn size="sm" variant="danger" title="Zurück in Demand-Backlog" onClick={e => { e.stopPropagation(); onDemote(p.id) }}><i className="ti ti-arrow-left" /> Demand</Btn>
                </div>
              </div>
              <div style={{ fontSize:11,color:'var(--text-secondary)',marginBottom:8 }}>
                {fmt(p.start_date)} – {fmt(p.end_date)} · {p.budget ? (p.budget/1000).toFixed(0)+'k €' : '—'} · {res.length} MA
              </div>
              <div style={{ display:'flex',gap:10,alignItems:'center' }}>
                <div style={{ flex:1,background:'var(--bg-secondary)',borderRadius:4,height:5 }}>
                  <div style={{ width:`${p.progress||0}%`,height:5,borderRadius:4,background:p.color }} />
                </div>
                <span style={{ fontSize:11,fontWeight:500 }}>{p.progress||0}%</span>
              </div>
              <div style={{ display:'flex',height:4,borderRadius:3,overflow:'hidden',gap:1,marginTop:8 }}>
                {PHASES.map((_,i) => <div key={i} style={{ flex:1,background: i<=phIdx ? PHASE_COLORS[i] : 'var(--bg-secondary)' }} />)}
              </div>
            </div>
          )
        })}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={<><i className="ti ti-briefcase" /> Projekt</>}>
        <FormRow label="Projekttitel"><input value={form.title} onChange={e => f('title', e.target.value)} /></FormRow>
        <FormGrid>
          <FormRow label="Kategorie">
            <select value={form.cat} onChange={e => f('cat', e.target.value)}>
              {['ERP','Data & Analytics','Business Applications','Security','Infrastructure','Emerging Technologies'].map(o=><option key={o}>{o}</option>)}
            </select>
          </FormRow>
          <FormRow label="Phase">
            <select value={form.phase} onChange={e => f('phase', e.target.value)}>
              {PHASES.map(o=><option key={o}>{o}</option>)}
            </select>
          </FormRow>
        </FormGrid>
        <FormGrid>
          <FormRow label="Projektstart"><input type="date" value={form.start_date} onChange={e => f('start_date', e.target.value)} /></FormRow>
          <FormRow label="Projektende"><input type="date" value={form.end_date} onChange={e => f('end_date', e.target.value)} /></FormRow>
        </FormGrid>
        <FormGrid>
          <FormRow label="Budget (€)"><input type="number" value={form.budget} onChange={e => f('budget', e.target.value)} /></FormRow>
          <FormRow label="Fortschritt (%)"><input type="number" value={form.progress} onChange={e => f('progress', e.target.value)} min="0" max="100" /></FormRow>
        </FormGrid>
        <FormGrid>
          <FormRow label="Projektleiter IT"><input value={form.pm_it} onChange={e => f('pm_it', e.target.value)} /></FormRow>
          <FormRow label="Projektleiter Business"><input value={form.pm_biz} onChange={e => f('pm_biz', e.target.value)} /></FormRow>
        </FormGrid>
        <ModalActions>
          <Btn onClick={() => setModal(false)}>Abbrechen</Btn>
          <Btn variant="primary" disabled={saving} onClick={save}><i className="ti ti-check" /> Speichern</Btn>
        </ModalActions>
      </Modal>
    </>
  )
}
