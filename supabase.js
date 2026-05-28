import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// ── Load all data from Supabase ────────────────────────────────────────────────
export async function loadData() {
  const sections = [
    'incidencias','maquinas','instalaciones','material',
    'tapizado','sugerencias','propuestas','clases','piscina','sauna'
  ]
  const result = {}
  for (const section of sections) {
    const { data, error } = await supabase
      .from(section)
      .select('*')
      .order('created_at', { ascending: true })
    if (error) {
      console.error(`Error loading ${section}:`, error)
      result[section] = []
    } else {
      result[section] = data || []
    }
  }
  return result
}

// ── Save a single row (upsert) ────────────────────────────────────────────────
export async function upsertRow(section, row) {
  const { error } = await supabase
    .from(section)
    .upsert(row, { onConflict: 'id' })
  if (error) console.error(`Error saving to ${section}:`, error)
}

// ── Delete a row ───────────────────────────────────────────────────────────────
export async function deleteRow(section, id) {
  const { error } = await supabase
    .from(section)
    .delete()
    .eq('id', id)
  if (error) console.error(`Error deleting from ${section}:`, error)
}

// ── Subscribe to realtime changes ─────────────────────────────────────────────
export function subscribeToChanges(section, callback) {
  return supabase
    .channel(`realtime_${section}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: section }, callback)
    .subscribe()
}
