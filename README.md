# IT Portfolio Management App

React + Vite App mit Supabase-Datenbankanbindung.

---

## Lokale Entwicklung

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Umgebungsvariablen setzen (bereits vorbefüllt in .env)
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_KEY=sb_publishable_...

# 3. Entwicklungsserver starten
npm run dev
```

Dann im Browser: http://localhost:5173

---

## Deployment auf Vercel

```bash
# Vercel CLI installieren
npm i -g vercel

# Einmalig einloggen
vercel login

# Deployment starten (im Projektordner)
vercel

# Für Production
vercel --prod
```

**Wichtig:** In Vercel unter *Project → Settings → Environment Variables* eintragen:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY`

---

## Deployment auf Netlify

```bash
# Build erstellen
npm run build

# dist-Ordner auf netlify.com hochladen
# oder via Netlify CLI:
npm i -g netlify-cli
netlify deploy --dir=dist --prod
```

**Wichtig:** In Netlify unter *Site Settings → Environment Variables* eintragen:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY`

---

## Datenbankschema (Supabase)

```sql
create table mitarbeiter (
  id serial primary key,
  name text, role text, team text, max_h integer default 40
);

create table projects (
  id serial primary key,
  title text, cat text, phase text,
  start_date date, end_date date,
  budget integer, progress integer default 0,
  pm_it text, pm_biz text,
  color text, milestones jsonb default '[]'
);

create table demands (
  id serial primary key,
  title text, req text, prio text, val text,
  effort integer, budget integer, status text default 'Neu',
  description text, start_date date
);

create table assignments (
  id serial primary key,
  ma_id integer references mitarbeiter(id),
  proj_id integer references projects(id),
  phase text, hours integer,
  from_date date, to_date date, note text
);
```

---

## Projektstruktur

```
src/
├── components/
│   ├── Dashboard.jsx      # Dashboard-Panel
│   ├── Demand.jsx         # Demand-Backlog
│   ├── Layout.jsx         # Sidebar + Topbar
│   ├── Layout.module.css
│   ├── Panels.jsx         # Roadmap, Kapazität, Ressourcen, Mitarbeiter
│   ├── Portfolio.jsx      # Portfolio + Projektdetail
│   ├── UI.jsx             # Badge, Btn, Modal, Card, Metric, Toast
│   └── UI.module.css
├── lib/
│   ├── constants.js       # PHASES, COLORS, fmt()
│   └── supabase.js        # Supabase-Client
├── App.jsx                # Hauptkomponente, State-Management
├── index.css              # Globale Styles
└── main.jsx               # React-Einstiegspunkt
```
