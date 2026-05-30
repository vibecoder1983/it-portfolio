import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY

if (!url || !key) {
  console.error('Supabase-Konfiguration fehlt. Bitte .env prüfen.')
}

export const sb = createClient(url, key)
