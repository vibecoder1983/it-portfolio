export const PHASES = [
  'Preparation',
  'Concept',
  'Implementation',
  'Go-Live Preparation',
  'Stabilization',
]

export const PHASE_COLORS = ['#534AB7','#185FA5','#1D9E75','#EF9F27','#639922']
export const PHASE_ICONS  = ['ti-rocket','ti-bulb','ti-code','ti-flag','ti-shield-check']

export const PROJ_COLORS = [
  '#E24B4A','#185FA5','#639922','#534AB7','#EF9F27',
  '#1D9E75','#D4537E','#D85A30','#378ADD',
]

export const MONTHS_SHORT = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']

export const D_STATUSES = ['Neu','In Bewertung','Freigegeben','Abgelehnt']

export const BADGE_CLASS = {
  Neu: 'b-blue',
  'In Bewertung': 'b-amber',
  Freigegeben: 'b-green',
  Abgelehnt: 'b-red',
  Offen: 'b-gray',
  'In Arbeit': 'b-blue',
  Erreicht: 'b-green',
  Verzögert: 'b-red',
  Hoch: 'b-red',
  Mittel: 'b-amber',
  Niedrig: 'b-green',
  'Sehr hoch': 'b-purple',
  ERP: 'b-amber',
  'Data & Analytics': 'b-teal',
  'Business Applications': 'b-blue',
  Security: 'b-red',
  Infrastructure: 'b-gray',
  'Emerging Technologies': 'b-purple',
  Preparation: 'b-purple',
  Concept: 'b-blue',
  Implementation: 'b-teal',
  'Go-Live Preparation': 'b-amber',
  Stabilization: 'b-green',
}

export function fmt(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export function projColor(index) {
  return PROJ_COLORS[index % PROJ_COLORS.length]
}
