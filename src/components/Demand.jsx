import React, { useState, useRef, useMemo } from 'react'
import { Badge, Btn, Card, CardHeader, Modal, ModalActions, FormRow, FormGrid, showToast } from './UI'
import { D_STATUSES, BADGE_CLASS, fmt } from '../lib/constants'
import { sb } from '../lib/supabase'

/* ── Business Case Modal ── */
function makeRows(n) { return [{ label: '', amounts: Array(n).fill('') }] }
const EMPTY_BC = (y=3) => ({ years: y, oneOffCosts: makeRows(1), recurringCosts: makeRows(y), benefits: makeRows(y) })

function num(v) { return parseFloat(String(v).replace(/\./g,'').replace(',','.')) || 0 }
function fmtInput(v) { return v === '' ? '' : v }

// CSS trick: hide number spinners via inline style on the input
const amtStyle = {
  width: '100%', padding: '6px 10px', border: '0.5px solid var(--border-mid)',
  borderRadius: 'var(--radius-md)', fontSize: 13, fontFamily: 'var(--font)',
  background: 'var(--bg-primary)', MozAppearance: 'textfield', textAlign: 'right',
}

function BusinessCaseModal({ open, onClose, demand, onSave }) {
  const [bc, setBc] = useState(() => demand?.business_case || EMPTY_BC())
  const [saving, setSaving] = useState(false)

  React.useEffect(() => {
    if (demand) setBc(demand.business_case || EMPTY_BC())
  }, [demand?.id])

  const years = bc.years

  function setYears(y) {
    setBc(p => ({
      ...p, years: y,
      oneOffCosts:    p.oneOffCosts.map(r => ({ ...r, amounts: Array(1).fill(r.amounts?.[0]||'') })),
      recurringCosts: p.recurringCosts.map(r => ({ ...r, amounts: Array(y).fill('').map((_,i) => r.amounts?.[i]||'') })),
      benefits:       p.benefits.map(r => ({ ...r, amounts: Array(y).fill('').map((_,i) => r.amounts?.[i]||'') })),
    }))
  }

  function addRow(key) {
    const len = key === 'oneOffCosts' ? 1 : years
    setBc(p => ({ ...p, [key]: [...p[key], { label:'', amounts: Array(len).fill('') }] }))
  }
  function removeRow(key, i) { setBc(p => ({ ...p, [key]: p[key].filter((_,j)=>j!==i) })) }
  function updateLabel(key, i, val) { setBc(p => ({ ...p, [key]: p[key].map((r,j)=>j===i?{...r,label:val}:r) })) }
  function updateAmount(key, i, yi, val) {
    setBc(p => ({ ...p, [key]: p[key].map((r,j)=>j===i?{...r,amounts:r.amounts.map((a,k)=>k===yi?val:a)}:r) }))
  }

  const calc = useMemo(() => {
    const oneOffTotal = bc.oneOffCosts.reduce((s,r)=>s+num(r.amounts?.[0]),0)
    const costsPerYear = Array.from({length:years},(_,yi)=>
      bc.recurringCosts.reduce((s,r)=>s+num(r.amounts?.[yi]),0))
    const benefitsPerYear = Array.from({length:years},(_,yi)=>
      bc.benefits.reduce((s,r)=>s+num(r.amounts?.[yi]),0))

    let payback=null, cumulative=-oneOffTotal
    const cashflows=[]
    let totalCost=oneOffTotal, totalBenefit=0
    for(let y=0;y<years;y++){
      const net=benefitsPerYear[y]-costsPerYear[y]
      cumulative+=net
      totalCost+=costsPerYear[y]
      totalBenefit+=benefitsPerYear[y]
      cashflows.push({year:y+1,benefit:benefitsPerYear[y],cost:costsPerYear[y],net,cumulative})
      if(payback===null&&cumulative>=0) payback=y+1
    }
    const roi=totalCost>0?(totalBenefit-totalCost)/totalCost*100:0
    return {oneOffTotal,totalCost,totalBenefit,roi,payback,cashflows}
  }, [bc])

  async function save() {
    if (!demand) return
    setSaving(true)
    const { error } = await sb.from('demands').update({
      business_case: bc,
      roi: Math.round(calc.roi*10)/10,
      payback_period: calc.payback
    }).eq('id', demand.id)
    setSaving(false)
    if (error) { showToast('Fehler: '+error.message, true); return }
    onSave({ ...demand, business_case: bc, roi: Math.round(calc.roi*10)/10, payback_period: calc.payback })
    showToast('Business Case gespeichert'); onClose()
  }

  const fmtEur = v => Math.round(v).toLocaleString('de-DE')+' €'
  const SH = ({icon,title}) => (
    <div style={{fontSize:11,fontWeight:600,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'.06em',margin:'1.2rem 0 .6rem',display:'flex',alignItems:'center',gap:6}}>
      <i className={`ti ${icon}`} style={{fontSize:13}}/>{title}
    </div>
  )

  function InputTable({ rowKey, colCount, colLabels }) {
    return (
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead>
            <tr>
              <th style={{textAlign:'left',padding:'4px 6px',fontSize:11,color:'var(--text-tertiary)',fontWeight:500,minWidth:140}}>Bezeichnung</th>
              {colLabels.map((l,i)=>(
                <th key={i} style={{textAlign:'right',padding:'4px 6px',fontSize:11,color:'var(--text-tertiary)',fontWeight:500,minWidth:110}}>{l}</th>
              ))}
              <th style={{width:32}}/>
            </tr>
          </thead>
          <tbody>
            {bc[rowKey].map((r,ri)=>(
              <tr key={ri}>
                <td style={{padding:'3px 4px 3px 0'}}>
                  <input value={r.label} onChange={e=>updateLabel(rowKey,ri,e.target.value)} placeholder="Bezeichnung eingeben"
                    style={{width:'100%',padding:'6px 10px',border:'0.5px solid var(--border-mid)',borderRadius:'var(--radius-md)',fontSize:13,fontFamily:'var(--font)',background:'var(--bg-primary)'}} />
                </td>
                {(r.amounts||[]).map((a,yi)=>(
                  <td key={yi} style={{padding:'3px 4px'}}>
                    <input value={a} onChange={e=>updateAmount(rowKey,ri,yi,e.target.value)}
                      placeholder="0"
                      style={{...amtStyle, WebkitAppearance:'none'}}
                      onFocus={e=>e.target.select()} />
                  </td>
                ))}
                <td style={{padding:'3px 0 3px 4px'}}>
                  <Btn size="sm" variant="danger" onClick={()=>removeRow(rowKey,ri)} disabled={bc[rowKey].length===1}><i className="ti ti-trash"/></Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Btn size="sm" onClick={()=>addRow(rowKey)} style={{marginTop:6}}><i className="ti ti-plus"/> Zeile hinzufügen</Btn>
      </div>
    )
  }

  const yearCols = Array.from({length:years},(_,i)=>`Jahr ${i+1}`)

  return (
    <Modal open={open} onClose={onClose} title={<><i className="ti ti-calculator"/> Business Case — {demand?.title}</>} wide>

      {/* Horizont */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:'1rem',flexWrap:'wrap'}}>
        <span style={{fontSize:13,fontWeight:500}}>Betrachtungszeitraum:</span>
        {[1,2,3,4,5].map(y=>(
          <button key={y} onClick={()=>setYears(y)}
            style={{padding:'5px 14px',borderRadius:'var(--radius-md)',border:'0.5px solid var(--border-mid)',cursor:'pointer',fontFamily:'var(--font)',fontSize:12,
              background:bc.years===y?'#185FA5':'var(--bg-primary)',color:bc.years===y?'#fff':'var(--text-secondary)'}}>
            {y} {y===1?'Jahr':'Jahre'}
          </button>
        ))}
      </div>

      {/* Einmalige Kosten */}
      <SH icon="ti-coin" title="Einmalige Kosten (One-off)" />
      <InputTable rowKey="oneOffCosts" colCount={1} colLabels={['Betrag (€)']} />

      {/* Laufende Kosten */}
      <SH icon="ti-refresh" title="Laufende Kosten / Jahr (€)" />
      <InputTable rowKey="recurringCosts" colCount={years} colLabels={yearCols} />

      {/* Benefits */}
      <SH icon="ti-trending-up" title="Benefits / Jahr (€)" />
      <InputTable rowKey="benefits" colCount={years} colLabels={yearCols} />

      {/* Ergebnis */}
      <SH icon="ti-chart-bar" title="Ergebnis" />
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:'1rem'}}>
        {[
          {label:'ROI',          value:`${calc.roi.toFixed(1)} %`,           color:calc.roi>=0?'#1D9E75':'#E24B4A'},
          {label:'Payback Period',value:calc.payback?`${calc.payback} ${calc.payback===1?'Jahr':'Jahre'}`:`> ${years} J.`, color:calc.payback?'#185FA5':'#EF9F27'},
          {label:'Gesamtkosten', value:fmtEur(calc.totalCost),               color:'#E24B4A'},
          {label:'Gesamtnutzen', value:fmtEur(calc.totalBenefit),            color:'#1D9E75'},
        ].map(k=>(
          <div key={k.label} style={{background:'var(--bg-secondary)',borderRadius:'var(--radius-lg)',padding:'10px 12px'}}>
            <div style={{fontSize:10,fontWeight:500,color:'var(--text-tertiary)',textTransform:'uppercase',marginBottom:3}}>{k.label}</div>
            <div style={{fontSize:17,fontWeight:700,color:k.color}}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Cashflow Tabelle */}
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead>
            <tr style={{borderBottom:'0.5px solid var(--border-light)'}}>
              {['Jahr','Benefits','Kosten','Netto','Kumulativ',''].map(h=>(
                <th key={h} style={{textAlign:'left',padding:'5px 8px',fontSize:10,fontWeight:500,color:'var(--text-tertiary)',textTransform:'uppercase'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{borderBottom:'0.5px solid var(--border-light)'}}>
              <td style={{padding:'5px 8px',fontWeight:500}}>Jahr 0</td>
              <td style={{padding:'5px 8px'}}>—</td>
              <td style={{padding:'5px 8px',color:'#E24B4A'}}>−{fmtEur(calc.oneOffTotal)}</td>
              <td style={{padding:'5px 8px',color:'#E24B4A'}}>−{fmtEur(calc.oneOffTotal)}</td>
              <td style={{padding:'5px 8px',fontWeight:600,color:'#E24B4A'}}>−{fmtEur(calc.oneOffTotal)}</td>
              <td/>
            </tr>
            {calc.cashflows.map(({year,benefit,cost,net,cumulative})=>(
              <tr key={year} style={{borderBottom:'0.5px solid var(--border-light)',background:cumulative>=0?'#F6FBF0':'transparent'}}>
                <td style={{padding:'5px 8px',fontWeight:500}}>Jahr {year}</td>
                <td style={{padding:'5px 8px',color:'#1D9E75'}}>{fmtEur(benefit)}</td>
                <td style={{padding:'5px 8px',color:'#E24B4A'}}>−{fmtEur(cost)}</td>
                <td style={{padding:'5px 8px',color:net>=0?'#1D9E75':'#E24B4A'}}>{net>=0?'+':''}{fmtEur(net)}</td>
                <td style={{padding:'5px 8px',fontWeight:600,color:cumulative>=0?'#1D9E75':'#E24B4A'}}>{cumulative>=0?'+':''}{fmtEur(cumulative)}</td>
                <td style={{padding:'5px 8px',fontSize:10,color:'#1D9E75'}}>{cumulative>=0&&year===calc.payback?'✓ Break-even':''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModalActions>
        <Btn onClick={onClose}>Abbrechen</Btn>
        <Btn variant="primary" disabled={saving} onClick={save}>
          {saving?'Speichert...':<><i className="ti ti-check"/> Speichern</>}
        </Btn>
      </ModalActions>
    </Modal>
  )
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const ALLOWED_EXT = '.pdf, .docx, .xlsx'

const EMPTY = { title:'', req:'', start_date:'', go_live_date:'', prio:'Hoch', val:'Sehr hoch', effort:'', budget:'', roi:'', payback_period:'', description:'', attachments:[] }

export default function Demand({ demands, setDemands, onPromote }) {
  const [filter, setFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const [bcDemand, setBcDemand] = useState(null)

  const list = filter ? demands.filter(d => d.status === filter) : demands

  async function setStatus(id, status) {
    const d = demands.find(x => x.id === id); if (!d) return
    const old = d.status
    setDemands(prev => prev.map(x => x.id === id ? { ...x, status } : x))
    const { error } = await sb.from('demands').update({ status }).eq('id', id)
    if (error) {
      setDemands(prev => prev.map(x => x.id === id ? { ...x, status: old } : x))
      showToast('Fehler beim Speichern', true)
    } else showToast('Status aktualisiert')
  }

  function openEdit(d) {
    setForm({ title: d.title||'', req: d.req||'', start_date: d.start_date||'', go_live_date: d.go_live_date||'', prio: d.prio||'Hoch', val: d.val||'Sehr hoch', effort: d.effort||'', budget: d.budget||'', roi: d.roi||'', payback_period: d.payback_period||'', description: d.description||'', attachments: d.attachments||[] })
    setEditId(d.id)
    setModal(true)
  }

  function openNew() { setForm(EMPTY); setEditId(null); setModal(true) }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = { ...form, effort: parseInt(form.effort)||0, budget: parseInt(form.budget)||0, roi: form.roi ? parseFloat(form.roi) : null, payback_period: form.payback_period ? parseInt(form.payback_period) : null, start_date: form.start_date||null, go_live_date: form.go_live_date||null }
    let error
    if (editId) {
      ;({ error } = await sb.from('demands').update(payload).eq('id', editId))
      if (!error) setDemands(prev => prev.map(x => x.id === editId ? { ...x, ...payload } : x))
    } else {
      payload.status = 'Neu'
      const res = await sb.from('demands').insert(payload).select().single()
      error = res.error
      if (!error) setDemands(prev => [...prev, res.data])
    }
    setSaving(false)
    if (error) { showToast('Fehler: ' + error.message, true); return }
    showToast('Vorhaben gespeichert')
    setModal(false)
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function uploadFile(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) { showToast('Nur PDF, DOCX oder XLSX erlaubt', true); return }
    setUploading(true)
    const path = `demand-${Date.now()}-${file.name.replace(/\s+/g, '_')}`
    const { error } = await sb.storage.from('demand-attachments').upload(path, file)
    if (error) { showToast('Upload fehlgeschlagen: ' + error.message, true); setUploading(false); return }
    const { data: { publicUrl } } = sb.storage.from('demand-attachments').getPublicUrl(path)
    const att = { name: file.name, path, url: publicUrl, type: file.type, size: file.size }
    setForm(p => ({ ...p, attachments: [...(p.attachments||[]), att] }))
    showToast('Datei hochgeladen')
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function removeAttachment(idx) {
    const att = form.attachments[idx]
    await sb.storage.from('demand-attachments').remove([att.path])
    setForm(p => ({ ...p, attachments: p.attachments.filter((_,i) => i !== idx) }))
  }

  function fileIcon(type) {
    if (type?.includes('pdf')) return 'ti-file-type-pdf'
    if (type?.includes('word')) return 'ti-file-type-docx'
    if (type?.includes('sheet')) return 'ti-file-spreadsheet'
    return 'ti-file'
  }

  return (
    <>
      <Card>
        <CardHeader title="Demand-Backlog">
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ fontSize:12,padding:'5px 8px',border:'0.5px solid var(--border-mid)',borderRadius:'var(--radius-md)',background:'var(--bg-primary)' }}>
            <option value="">Alle Status</option>
            {D_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <Btn variant="primary" onClick={openNew}><i className="ti ti-plus" /> Neu</Btn>
        </CardHeader>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13,minWidth:860 }}>
            <thead>
              <tr>
                {['Vorhaben','Antragsteller','Priorität','Budget (€)','Aufwand','Status','','',''].map(h => (
                  <th key={h} style={{ textAlign:'left',padding:'8px 10px',fontSize:11,fontWeight:500,color:'var(--text-tertiary)',borderBottom:'0.5px solid var(--border-light)',textTransform:'uppercase',letterSpacing:'.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map(d => (
                <tr key={d.id} style={{ borderBottom:'0.5px solid var(--border-light)' }}>
                  <td style={{ padding:'8px 10px' }}>
                    <div style={{ fontWeight:500 }}>{d.title}</div>
                    <div style={{ fontSize:11,color:'var(--text-tertiary)' }}>{d.description}</div>
                  </td>
                  <td style={{ padding:'8px 10px',fontSize:12 }}>
                    {d.req}<br /><span style={{ fontSize:11,color:'var(--text-tertiary)' }}>{d.start_date ? fmt(d.start_date) : ''}</span>
                  </td>
                  <td style={{ padding:'8px 10px' }}><Badge label={d.prio} /></td>
                  <td style={{ padding:'8px 10px',fontWeight:500,fontSize:12 }}>{d.budget ? d.budget.toLocaleString('de-DE') : '—'}</td>
                  <td style={{ padding:'8px 10px',fontSize:12 }}>{d.effort||0} PT</td>
                  <td style={{ padding:'8px 10px' }}>
                    <div style={{ display:'flex',flexWrap:'wrap',gap:3 }}>
                      {D_STATUSES.map(s => (
                        <button key={s} onClick={() => setStatus(d.id, s)} style={{ fontSize:11,padding:'3px 7px',borderRadius:4,border:'0.5px solid var(--border-mid)',background: d.status===s ? '' : 'var(--bg-primary)',cursor:'pointer',fontFamily:'var(--font)', ...(d.status===s ? { fontWeight:500 } : { color:'var(--text-secondary)' }) }}
                          className={d.status===s ? `badge ${BADGE_CLASS[s]||'b-gray'}` : ''}
                        >{s}</button>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding:'8px 10px' }}>
                    <Btn size="sm" onClick={() => openEdit(d)}><i className="ti ti-edit" /></Btn>
                  </td>
                  <td style={{ padding:'8px 10px' }}>
                    <Btn size="sm" title="Business Case erfassen" onClick={() => setBcDemand(d)}
                      style={{ display:'inline-flex',alignItems:'center',gap:4,position:'relative' }}>
                      <i className="ti ti-calculator" /> Business Case
                      {d.business_case && <span style={{ width:7,height:7,borderRadius:'50%',background:'#1D9E75',position:'absolute',top:2,right:2 }} />}
                    </Btn>
                  </td>
                  <td style={{ padding:'8px 10px' }}>
                    <Btn size="sm" variant="primary" title="Ins Portfolio übernehmen" onClick={() => onPromote(d.id)}>
                      <i className="ti ti-arrow-right" /> Portfolio
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={<><i className="ti ti-inbox" /> Vorhaben erfassen / bearbeiten</>} wide>
        <FormRow label="Titel"><input value={form.title} onChange={e => f('title', e.target.value)} placeholder="Bezeichnung" /></FormRow>
        <FormGrid>
          <FormRow label="Antragsteller"><input value={form.req} onChange={e => f('req', e.target.value)} /></FormRow>
          <FormRow label="Plan-Start"><input type="date" value={form.start_date} onChange={e => f('start_date', e.target.value)} /></FormRow>
        </FormGrid>
        <FormGrid>
          <FormRow label="Geplanter Go-Live"><input type="date" value={form.go_live_date} onChange={e => f('go_live_date', e.target.value)} /></FormRow>
          <FormRow label="Priorität">
            <select value={form.prio} onChange={e => f('prio', e.target.value)}>
              {['Hoch','Mittel','Niedrig'].map(o => <option key={o}>{o}</option>)}
            </select>
          </FormRow>
        </FormGrid>
        <FormGrid>
          <FormRow label="Geschäftswert">
            <select value={form.val} onChange={e => f('val', e.target.value)}>
              {['Sehr hoch','Hoch','Mittel','Gering'].map(o => <option key={o}>{o}</option>)}
            </select>
          </FormRow>
          <FormRow label="Aufwand IT (PT)"><input type="number" value={form.effort} onChange={e => f('effort', e.target.value)} min="1" /></FormRow>
        </FormGrid>
        <FormGrid>
          <FormRow label="Budget (€)"><input type="number" value={form.budget} onChange={e => f('budget', e.target.value)} /></FormRow>
          <FormRow label="ROI (%)"><input type="number" value={form.roi} onChange={e => f('roi', e.target.value)} placeholder="z.B. 25" step="0.1" /></FormRow>
        </FormGrid>
        <FormGrid>
          <FormRow label="Payback Period (Monate)"><input type="number" value={form.payback_period} onChange={e => f('payback_period', e.target.value)} placeholder="z.B. 18" min="1" /></FormRow>
          <div />
        </FormGrid>
        <FormRow label="Beschreibung"><textarea value={form.description} onChange={e => f('description', e.target.value)} rows={3} /></FormRow>

        {/* Attachments */}
        <div style={{ marginTop:'1rem' }}>
          <div style={{ fontSize:12,fontWeight:500,color:'var(--text-secondary)',marginBottom:6 }}>Anhänge <span style={{ fontWeight:400,color:'var(--text-tertiary)' }}>(PDF, DOCX, XLSX)</span></div>
          {(form.attachments||[]).map((att, i) => (
            <div key={i} style={{ display:'flex',alignItems:'center',gap:8,padding:'5px 8px',background:'var(--bg-secondary)',borderRadius:'var(--radius-md)',marginBottom:4,fontSize:12 }}>
              <i className={`ti ${fileIcon(att.type)}`} style={{ fontSize:14,color:'var(--text-secondary)' }} />
              <a href={att.url} target="_blank" rel="noreferrer" style={{ flex:1,color:'var(--text-primary)',textDecoration:'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{att.name}</a>
              <span style={{ fontSize:11,color:'var(--text-tertiary)' }}>{(att.size/1024).toFixed(0)} KB</span>
              <Btn size="sm" variant="danger" onClick={() => removeAttachment(i)}><i className="ti ti-trash" /></Btn>
            </div>
          ))}
          <div style={{ display:'flex',alignItems:'center',gap:8,marginTop:4 }}>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx" style={{ display:'none' }} onChange={uploadFile} />
            <Btn size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <><i className="ti ti-loader" style={{ animation:'spin .6s linear infinite',display:'inline-block' }} /> Lädt hoch...</> : <><i className="ti ti-upload" /> Datei anhängen</>}
            </Btn>
          </div>
        </div>

        <ModalActions>
          <Btn onClick={() => setModal(false)}>Abbrechen</Btn>
          <Btn variant="primary" disabled={saving} onClick={save}>
            {saving ? <><span style={{ display:'inline-block',width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .6s linear infinite',verticalAlign:'middle',marginRight:4 }} />Speichert...</> : <><i className="ti ti-check" /> Speichern</>}
          </Btn>
        </ModalActions>
      </Modal>

      <BusinessCaseModal
        open={!!bcDemand}
        onClose={() => setBcDemand(null)}
        demand={bcDemand}
        onSave={updated => setDemands(prev => prev.map(d => d.id === updated.id ? updated : d))}
      />
    </>
  )
}
