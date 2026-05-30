import React, { useEffect, useRef } from 'react'
import { BADGE_CLASS } from '../lib/constants'
import styles from './UI.module.css'

/* ── Badge ── */
export function Badge({ label }) {
  const cls = BADGE_CLASS[label] || 'b-gray'
  return <span className={`${styles.badge} ${styles[cls]}`}>{label}</span>
}

/* ── Button ── */
export function Btn({ children, variant = 'default', size = 'md', disabled, onClick, title, type = 'button' }) {
  const cls = [
    styles.btn,
    styles[`btn-${variant}`],
    styles[`btn-${size}`],
  ].join(' ')
  return (
    <button type={type} className={cls} disabled={disabled} onClick={onClick} title={title}>
      {children}
    </button>
  )
}

/* ── Modal ── */
export function Modal({ id, title, open, onClose, children, wide }) {
  const ref = useRef()
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className={styles.modalOverlay} onClick={e => { if (e.target === ref.current) onClose() }} ref={ref}>
      <div className={styles.modal} style={wide ? { width: 640 } : {}}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  )
}

export function ModalActions({ children }) {
  return <div className={styles.modalActions}>{children}</div>
}

/* ── FormRow ── */
export function FormRow({ label, children, half }) {
  return (
    <div className={styles.frow} style={half ? { flex: 1 } : {}}>
      <label className={styles.flabel}>{label}</label>
      {children}
    </div>
  )
}

export function FormGrid({ children }) {
  return <div className={styles.formGrid}>{children}</div>
}

/* ── Card ── */
export function Card({ children, style }) {
  return <div className={styles.card} style={style}>{children}</div>
}

export function CardHeader({ title, children }) {
  return (
    <div className={styles.cardHeader}>
      <div className={styles.cardTitle}>{title}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{children}</div>
    </div>
  )
}

/* ── Metric ── */
export function Metric({ label, value, sub }) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricVal}>{value}</div>
      {sub && <div className={styles.metricSub}>{sub}</div>}
    </div>
  )
}

/* ── Toast (imperative) ── */
export function showToast(msg, err = false) {
  const t = document.createElement('div')
  t.className = `${styles.toast} ${err ? styles.toastErr : ''}`
  t.textContent = msg
  document.body.appendChild(t)
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400) }, 2500)
}
