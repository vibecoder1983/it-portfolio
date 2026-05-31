import React, { useState, useRef } from 'react'
import { Badge, Btn, Card, CardHeader, Modal, ModalActions, FormRow, FormGrid, showToast } from './UI'
import { D_STATUSES, BADGE_CLASS, fmt } from '../lib/constants'
import { sb } from '../lib/supabase'

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
                {['Vorhaben','Antragsteller','Priorität','Budget (€)','Aufwand','Status','',''].map(h => (
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
    </>
  )
}
