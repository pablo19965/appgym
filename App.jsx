import { useState, useEffect, useCallback, useRef } from 'react'
import { loadData, upsertRow, deleteRow, supabase } from './supabase.js'
import './App.css'

const WORKERS = ['Arturo', 'Mario', 'Guildo', 'José', 'Javi', '-']
const PRIO_OPTS = ['🔴 URGENTE', '🟠 Alta', '🟡 Media', '🟢 Baja']
const ZONA_OPTS = ['Indoor 🏠', 'Outdoor 🌳', 'Ambas', 'General']
const SECTIONS = ['incidencias','maquinas','instalaciones','material','tapizado','sugerencias','propuestas','clases','piscina','sauna']

const TABS = [
  { key: 'resumen',       label: '📊 Resumen',        color: '#1A1A2E' },
  { key: 'urgencias',     label: '🚨 Urgencias',       color: '#E74C3C' },
  { key: 'incidencias',   label: '📋 Incidencias',     color: '#1A1A2E' },
  { key: 'maquinas',      label: '🔧 Máquinas',        color: '#F39C12' },
  { key: 'instalaciones', label: '🏗️ Instalaciones',  color: '#2980B9' },
  { key: 'material',      label: '📦 Material',        color: '#27AE60' },
  { key: 'tapizado',      label: '🪑 Tapizado',        color: '#795548' },
  { key: 'sugerencias',   label: '💬 Sugerencias',     color: '#16A085' },
  { key: 'propuestas',    label: '💡 Propuestas',       color: '#8E44AD' },
  { key: 'clases',        label: '🏃 Clases',          color: '#27AE60' },
  { key: 'singular',      label: '🌊 Singular',        color: '#1565C0' },
  { key: 'tareas',        label: '👥 Tareas',          color: '#1A1A2E' },
]

const WORKER_COLORS = {
  Arturo: '#1565C0', Mario: '#6A1B9A', Guildo: '#1B5E20',
  'José': '#E65100', Javi: '#00838F'
}

function statusClass(s) {
  if (!s) return ''
  const v = s.toLowerCase()
  if (['resuelta','resuelto','reparado','reparada','recibido','implementada','finalizado','cerrado','aprobada'].some(x => v.includes(x))) return 'st-green'
  if (['en curso','en reparación','en revisión','presupuestando','en tránsito','en estudio','en atención','pedido','gestionada'].some(x => v.includes(x))) return 'st-yellow'
  if (['abierta','pendiente','escalado'].some(x => v.includes(x))) return 'st-red'
  if (['cancelada','cancelado','rechazada','descartada','baja'].some(x => v.includes(x))) return 'st-grey'
  return ''
}

function prioClass(p) {
  if (!p) return ''
  if (p.includes('URGENTE')) return 'pr-urg'
  if (p.includes('Alta'))    return 'pr-high'
  if (p.includes('Media'))   return 'pr-med'
  if (p.includes('Baja'))    return 'pr-low'
  return ''
}

function nextId(rows, prefix) {
  const nums = rows.map(r => parseInt((r.id || '').replace(prefix + '-', '')) || 0)
  return `${prefix}-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`
}

// ── Generic Table Component ────────────────────────────────────────────────────
function DataTable({ cols, rows, onEdit, onDelete, onAdd, emptyRow, color }) {
  return (
    <div className="tbl-wrap">
      <div className="tbl-scroll">
        <table className="tbl">
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c.key} style={{ background: color, minWidth: c.w || 110 }}>{c.label}</th>
              ))}
              <th style={{ background: color, width: 36 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.id || ri} className={ri % 2 === 0 ? 'r-alt' : 'r-plain'}>
                {cols.map(c => {
                  const val = row[c.key]
                  const cls = c.key === 'estado' ? statusClass(val) : c.key === 'prioridad' ? prioClass(val) : ''
                  return (
                    <td key={c.key} className={`td ${cls}`}>
                      {c.opts ? (
                        <select value={val || ''} onChange={e => onEdit(ri, c.key, e.target.value)} className="sel">
                          <option value="">—</option>
                          {c.opts.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          className="inp"
                          value={val || ''}
                          onChange={e => onEdit(ri, c.key, e.target.value)}
                        />
                      )}
                    </td>
                  )
                })}
                <td className="td-del">
                  <button className="btn-del" onClick={() => onDelete(ri)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn-add" onClick={() => onAdd(emptyRow)} style={{ borderColor: color, color }}>
        + Añadir fila
      </button>
    </div>
  )
}

function SectionHeader({ title, sub, color }) {
  return (
    <div className="sec-hdr" style={{ background: color }}>
      <div className="sec-title">{title}</div>
      {sub && <div className="sec-sub">{sub}</div>}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="stat-card" style={{ borderLeftColor: color }}>
      <div className="stat-val" style={{ color }}>{value}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  )
}

// ── MAIN APP ───────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('resumen')
  const [status, setStatus] = useState('loading') // loading | ok | saving | error
  const saveTimers = useRef({})

  // Load initial data
  useEffect(() => {
    loadData().then(d => {
      setData(d)
      setStatus('ok')
    }).catch(() => setStatus('error'))
  }, [])

  // Realtime subscriptions
  useEffect(() => {
    if (!data) return
    const channels = SECTIONS.map(section =>
      supabase.channel(`rt_${section}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: section }, payload => {
          setData(prev => {
            if (!prev) return prev
            const rows = [...(prev[section] || [])]
            if (payload.eventType === 'INSERT') {
              if (!rows.find(r => r.id === payload.new.id)) return { ...prev, [section]: [...rows, payload.new] }
            } else if (payload.eventType === 'UPDATE') {
              return { ...prev, [section]: rows.map(r => r.id === payload.new.id ? payload.new : r) }
            } else if (payload.eventType === 'DELETE') {
              return { ...prev, [section]: rows.filter(r => r.id !== payload.old.id) }
            }
            return prev
          })
        })
        .subscribe()
    )
    return () => channels.forEach(c => supabase.removeChannel(c))
  }, [!!data])

  // Debounced save
  const schedSave = useCallback((section, row) => {
    setStatus('saving')
    clearTimeout(saveTimers.current[row.id])
    saveTimers.current[row.id] = setTimeout(async () => {
      await upsertRow(section, row)
      setStatus('ok')
    }, 600)
  }, [])

  function editRow(section, ri, key, val) {
    setData(prev => {
      const rows = prev[section].map((r, i) => i === ri ? { ...r, [key]: val } : r)
      schedSave(section, rows[ri])
      return { ...prev, [section]: rows }
    })
  }

  async function delRow(section, ri) {
    const row = data[section][ri]
    setData(prev => ({ ...prev, [section]: prev[section].filter((_, i) => i !== ri) }))
    await deleteRow(section, row.id)
  }

  async function addRow(section, emptyRow) {
    const newRow = { ...emptyRow, created_at: new Date().toISOString() }
    setData(prev => ({ ...prev, [section]: [...prev[section], newRow] }))
    await upsertRow(section, newRow)
  }

  if (status === 'loading' || !data) {
    return (
      <div className="loading-screen">
        <div className="loading-icon">🏋️</div>
        <div className="loading-text">Conectando con la base de datos…</div>
        <div className="loading-sub">Cargando incidencias del gimnasio</div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="loading-screen">
        <div className="loading-icon">⚠️</div>
        <div className="loading-text">Error de conexión</div>
        <div className="loading-sub">Comprueba las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY</div>
      </div>
    )
  }

  const urgentes = [
    ...data.incidencias.filter(r => r.prioridad?.includes('URGENTE')).map(r => ({ ...r, origen: 'Incidencias' })),
    ...data.maquinas.filter(r => r.prioridad?.includes('URGENTE')).map(r => ({ ...r, origen: 'Máquinas' })),
    ...data.instalaciones.filter(r => r.prioridad?.includes('URGENTE')).map(r => ({ ...r, origen: 'Instalaciones' })),
    ...data.tapizado.filter(r => r.prioridad?.includes('URGENTE')).map(r => ({ ...r, origen: 'Tapizado' })),
    ...data.clases.filter(r => r.prioridad?.includes('URGENTE')).map(r => ({ ...r, origen: 'Clases' })),
    ...data.piscina.filter(r => r.prioridad?.includes('URGENTE')).map(r => ({ ...r, origen: 'Piscina' })),
    ...data.sauna.filter(r => r.prioridad?.includes('URGENTE')).map(r => ({ ...r, origen: 'Sauna' })),
  ]

  const today = new Date().toLocaleDateString('es-ES')

  return (
    <div className="app">
      {/* ── HEADER ── */}
      <header className="app-hdr">
        <div className="hdr-inner">
          <div className="hdr-brand">
            <span className="hdr-icon">🏋️</span>
            <div>
              <div className="hdr-title">GYM INCIDENCIAS</div>
              <div className="hdr-sub">Indoor 🏠 & Outdoor 🌳 — Panel de gestión compartido</div>
            </div>
          </div>
          <div className="hdr-right">
            {status === 'saving' && <span className="badge-saving">💾 Guardando…</span>}
            {status === 'ok'     && <span className="badge-ok">✅ Sincronizado</span>}
            {urgentes.length > 0 && <div className="badge-urg">{urgentes.length} 🔴 Urgentes</div>}
          </div>
        </div>
      </header>

      {/* ── TABS ── */}
      <nav className="tab-bar">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? 'tab-on' : ''}`}
            style={tab === t.key ? { borderBottomColor: t.color, color: t.color } : {}}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === 'urgencias' && urgentes.length > 0 && (
              <span className="tab-dot">{urgentes.length}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ── CONTENT ── */}
      <main className="app-main">

        {/* RESUMEN */}
        {tab === 'resumen' && (
          <div>
            <SectionHeader title="📊 Resumen General" sub={`Actualizado: ${today} — Datos en tiempo real`} color="#1A1A2E" />
            <div className="stat-grid">
              <StatCard label="🚨 Urgencias activas" value={urgentes.length} color="#E74C3C" />
              <StatCard label="📋 Incidencias abiertas" value={data.incidencias.filter(r => ['Abierta','Pendiente'].includes(r.estado)).length} color="#F39C12" />
              <StatCard label="🔧 Máquinas pendientes" value={data.maquinas.filter(r => ['Pendiente','En reparación'].includes(r.estado)).length} color="#2980B9" />
              <StatCard label="🏗️ Instalaciones" value={data.instalaciones.filter(r => ['Pendiente','En curso'].includes(r.estado)).length} color="#2980B9" />
              <StatCard label="📦 Material por pedir" value={data.material.filter(r => r.estado === 'Pendiente').length} color="#27AE60" />
              <StatCard label="🪑 Tapizados" value={data.tapizado.filter(r => ['Pendiente','En reparación'].includes(r.estado)).length} color="#795548" />
              <StatCard label="💬 Sugerencias" value={data.sugerencias.filter(r => r.estado === 'Pendiente').length} color="#16A085" />
              <StatCard label="💡 Propuestas sin leer" value={data.propuestas.filter(r => r.leido === '📬 Pendiente lectura').length} color="#8E44AD" />
            </div>

            <SectionHeader title="👥 Tareas pendientes por trabajador" sub="" color="#16213E" />
            <div className="worker-grid">
              {WORKERS.filter(w => w !== '-').map(worker => {
                const n = [
                  ...data.incidencias.filter(r => r.responsable === worker && !['Resuelta','Cancelada','Finalizado'].includes(r.estado)),
                  ...data.maquinas.filter(r => r.responsable === worker && !['Reparada','Baja/Retirada'].includes(r.estado)),
                  ...data.instalaciones.filter(r => r.responsable === worker && !['Finalizado','Cancelado'].includes(r.estado)),
                  ...data.tapizado.filter(r => r.responsable === worker && !['Reparado','Sustituido'].includes(r.estado)),
                ].length
                const c = WORKER_COLORS[worker] || '#546E7A'
                return (
                  <div key={worker} className="w-card" style={{ borderColor: c }}>
                    <div className="w-name" style={{ color: c }}>👤 {worker}</div>
                    <div className="w-num" style={{ color: c }}>{n}</div>
                    <div className="w-lbl">tareas pendientes</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* URGENCIAS */}
        {tab === 'urgencias' && (
          <div>
            <SectionHeader title="🚨 Urgencias — Incidencias Críticas" sub="Se actualizan automáticamente al marcar 🔴 URGENTE en cualquier sección" color="#E74C3C" />
            {urgentes.length === 0
              ? <div className="empty">✅ No hay urgencias activas en este momento</div>
              : (
                <div className="tbl-scroll" style={{ borderRadius: '0 0 8px 8px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        {['Origen','ID','Fecha','Zona','Descripción','Estado','Prioridad','Responsable'].map(h => (
                          <th key={h} style={{ background: '#E74C3C' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {urgentes.map((r, i) => (
                        <tr key={i} className="r-urg">
                          <td className="td"><span className="orig-badge">{r.origen}</span></td>
                          <td className="td mono">{r.id}</td>
                          <td className="td">{r.fecha}</td>
                          <td className="td">{r.zona}</td>
                          <td className="td td-desc">{r.descripcion}</td>
                          <td className={`td ${statusClass(r.estado)}`}>{r.estado}</td>
                          <td className={`td ${prioClass(r.prioridad)}`}>{r.prioridad}</td>
                          <td className="td">{r.responsable}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        )}

        {/* INCIDENCIAS */}
        {tab === 'incidencias' && (
          <div>
            <SectionHeader title="📋 Registro General de Incidencias" sub="Indoor 🏠 & Outdoor 🌳 — Todas las zonas" color="#1A1A2E" />
            <DataTable color="#1A1A2E"
              cols={[
                { key:'id',          label:'ID',              w:90  },
                { key:'fecha',       label:'Fecha',           w:100 },
                { key:'zona',        label:'Zona',            w:130, opts:ZONA_OPTS },
                { key:'area',        label:'Área / Ubicación',w:180 },
                { key:'categoria',   label:'Categoría',       w:130, opts:['Máquina','Instalación','Material','Limpieza','Seguridad','Otro'] },
                { key:'descripcion', label:'Descripción',     w:260 },
                { key:'estado',      label:'Estado',          w:120, opts:['Abierta','En curso','Resuelta','Cancelada','Pendiente'] },
                { key:'prioridad',   label:'Prioridad',       w:140, opts:PRIO_OPTS },
                { key:'responsable', label:'Responsable',     w:120, opts:WORKERS },
                { key:'obs',         label:'Observaciones',   w:180 },
              ]}
              rows={data.incidencias}
              onEdit={(ri,k,v) => editRow('incidencias',ri,k,v)}
              onDelete={ri => delRow('incidencias',ri)}
              onAdd={r => addRow('incidencias',r)}
              emptyRow={{ id:nextId(data.incidencias,'INC'), fecha:today, zona:'', area:'', categoria:'', descripcion:'', estado:'Abierta', prioridad:'🟡 Media', responsable:'', obs:'' }}
            />
          </div>
        )}

        {/* MAQUINAS */}
        {tab === 'maquinas' && (
          <div>
            <SectionHeader title="🔧 Máquinas a Reparar" sub="Control de averías · Indoor 🏠 & Outdoor 🌳" color="#F39C12" />
            <DataTable color="#F39C12"
              cols={[
                { key:'id',          label:'ID',              w:90  },
                { key:'fecha',       label:'Fecha avería',    w:100 },
                { key:'zona',        label:'Zona',            w:120, opts:['Indoor 🏠','Outdoor 🌳'] },
                { key:'nombre',      label:'Nombre máquina',  w:190 },
                { key:'descripcion', label:'Descripción',     w:260 },
                { key:'prioridad',   label:'Prioridad',       w:140, opts:PRIO_OPTS },
                { key:'estado',      label:'Estado',          w:140, opts:['Pendiente','En reparación','Reparada','Baja/Retirada'] },
                { key:'responsable', label:'Responsable',     w:120, opts:WORKERS },
                { key:'obs',         label:'Observaciones',   w:180 },
              ]}
              rows={data.maquinas}
              onEdit={(ri,k,v) => editRow('maquinas',ri,k,v)}
              onDelete={ri => delRow('maquinas',ri)}
              onAdd={r => addRow('maquinas',r)}
              emptyRow={{ id:nextId(data.maquinas,'MAQ'), fecha:today, zona:'', nombre:'', descripcion:'', prioridad:'🟡 Media', estado:'Pendiente', responsable:'', obs:'' }}
            />
          </div>
        )}

        {/* INSTALACIONES */}
        {tab === 'instalaciones' && (
          <div>
            <SectionHeader title="🏗️ Desperfectos de Instalaciones" sub="Fontanería, electricidad, climatización… · Indoor 🏠 & Outdoor 🌳" color="#2980B9" />
            <DataTable color="#2980B9"
              cols={[
                { key:'id',          label:'ID',              w:90  },
                { key:'fecha',       label:'Fecha',           w:100 },
                { key:'zona',        label:'Zona',            w:140, opts:['Indoor 🏠','Outdoor 🌳','Zonas comunes'] },
                { key:'area',        label:'Área',            w:160 },
                { key:'descripcion', label:'Descripción',     w:260 },
                { key:'prioridad',   label:'Prioridad',       w:140, opts:PRIO_OPTS },
                { key:'estado',      label:'Estado',          w:130, opts:['Pendiente','En curso','Finalizado','Cancelado'] },
                { key:'responsable', label:'Responsable',     w:120, opts:WORKERS },
                { key:'obs',         label:'Observaciones',   w:180 },
              ]}
              rows={data.instalaciones}
              onEdit={(ri,k,v) => editRow('instalaciones',ri,k,v)}
              onDelete={ri => delRow('instalaciones',ri)}
              onAdd={r => addRow('instalaciones',r)}
              emptyRow={{ id:nextId(data.instalaciones,'INS'), fecha:today, zona:'', area:'', descripcion:'', prioridad:'🟡 Media', estado:'Pendiente', responsable:'', obs:'' }}
            />
          </div>
        )}

        {/* MATERIAL */}
        {tab === 'material' && (
          <div>
            <SectionHeader title="📦 Material a Pedir / Reponer" sub="Control de pedidos y stock" color="#27AE60" />
            <div className="mat-chips">
              {['Higiene','Limpieza','Accesorios','Repuestos','Señalización','Otros'].map(cat => (
                <span key={cat} className="mat-chip">
                  {cat}: <strong>{data.material.filter(r => r.categoria===cat && ['Pendiente','Pedido','En tránsito'].includes(r.estado)).length}</strong> pendientes
                </span>
              ))}
            </div>
            <DataTable color="#27AE60"
              cols={[
                { key:'id',        label:'ID',              w:90  },
                { key:'fecha',     label:'Fecha',           w:100 },
                { key:'zona',      label:'Zona',            w:120, opts:['Indoor 🏠','Outdoor 🌳','Ambas'] },
                { key:'articulo',  label:'Artículo',        w:230 },
                { key:'categoria', label:'Categoría',       w:140, opts:['Higiene','Limpieza','Accesorios','Repuestos','Señalización','Otros'] },
                { key:'estado',    label:'Estado pedido',   w:140, opts:['Pendiente','Pedido','En tránsito','Recibido','Cancelado'] },
                { key:'cantidad',  label:'Cantidad',        w:90  },
                { key:'unidad',    label:'Unidad',          w:80  },
                { key:'obs',       label:'Observaciones',   w:180 },
              ]}
              rows={data.material}
              onEdit={(ri,k,v) => editRow('material',ri,k,v)}
              onDelete={ri => delRow('material',ri)}
              onAdd={r => addRow('material',r)}
              emptyRow={{ id:nextId(data.material,'PED'), fecha:today, zona:'', articulo:'', categoria:'', estado:'Pendiente', cantidad:1, unidad:'ud', obs:'' }}
            />
          </div>
        )}

        {/* TAPIZADO */}
        {tab === 'tapizado' && (
          <div>
            <SectionHeader title="🪑 Control de Tapizado" sub="Registro de roturas y reparaciones · Indoor 🏠 & Outdoor 🌳" color="#795548" />
            <DataTable color="#795548"
              cols={[
                { key:'id',          label:'ID',              w:90  },
                { key:'fecha',       label:'Fecha',           w:100 },
                { key:'zona',        label:'Zona',            w:120, opts:['Indoor 🏠','Outdoor 🌳'] },
                { key:'maquina',     label:'Máquina / Elemento',w:200 },
                { key:'zona_tap',    label:'Zona tapizado',   w:150 },
                { key:'deterioro',   label:'Deterioro',       w:120, opts:['Leve','Moderado','Grave','Muy grave'] },
                { key:'prioridad',   label:'Prioridad',       w:140, opts:PRIO_OPTS },
                { key:'estado',      label:'Estado',          w:140, opts:['Pendiente','En reparación','Reparado','Sustituido'] },
                { key:'responsable', label:'Responsable',     w:120, opts:WORKERS },
                { key:'obs',         label:'Observaciones',   w:180 },
              ]}
              rows={data.tapizado}
              onEdit={(ri,k,v) => editRow('tapizado',ri,k,v)}
              onDelete={ri => delRow('tapizado',ri)}
              onAdd={r => addRow('tapizado',r)}
              emptyRow={{ id:nextId(data.tapizado,'TAP'), fecha:today, zona:'', maquina:'', zona_tap:'', deterioro:'Leve', prioridad:'🟡 Media', estado:'Pendiente', responsable:'', obs:'' }}
            />
          </div>
        )}

        {/* SUGERENCIAS */}
        {tab === 'sugerencias' && (
          <div>
            <SectionHeader title="💬 Sugerencias de Clientes" sub="Registro de quejas y sugerencias · Indoor 🏠 & Outdoor 🌳" color="#16A085" />
            <div className="sug-total">
              Total quejas registradas: <strong>{data.sugerencias.reduce((a,r) => a+(parseInt(r.veces)||0), 0)}</strong>
            </div>
            <DataTable color="#16A085"
              cols={[
                { key:'id',          label:'ID',              w:90  },
                { key:'fecha',       label:'Fecha',           w:100 },
                { key:'zona',        label:'Zona',            w:130, opts:ZONA_OPTS },
                { key:'categoria',   label:'Categoría',       w:140, opts:['Instalaciones','Equipamiento','Limpieza','Atención','Horarios','Clases','Temperatura','Música','Vestuarios','Otro'] },
                { key:'descripcion', label:'Descripción',     w:260 },
                { key:'veces',       label:'Nº veces',        w:80  },
                { key:'prioridad',   label:'Prioridad',       w:140, opts:PRIO_OPTS },
                { key:'estado',      label:'Estado',          w:130, opts:['Pendiente','En revisión','Respondida','Implementada','Descartada'] },
                { key:'respuesta',   label:'Respuesta',       w:200 },
                { key:'responsable', label:'Responsable',     w:120, opts:WORKERS },
                { key:'obs',         label:'Observaciones',   w:180 },
              ]}
              rows={data.sugerencias}
              onEdit={(ri,k,v) => editRow('sugerencias',ri,k,v)}
              onDelete={ri => delRow('sugerencias',ri)}
              onAdd={r => addRow('sugerencias',r)}
              emptyRow={{ id:nextId(data.sugerencias,'SUG'), fecha:today, zona:'', categoria:'', descripcion:'', veces:1, prioridad:'🟡 Media', estado:'Pendiente', respuesta:'', responsable:'', obs:'' }}
            />
          </div>
        )}

        {/* PROPUESTAS */}
        {tab === 'propuestas' && (
          <div>
            <SectionHeader title="💡 Propuestas de Trabajadores" sub="Ideas y mejoras propuestas por el equipo" color="#8E44AD" />
            <DataTable color="#8E44AD"
              cols={[
                { key:'id',           label:'ID',              w:90  },
                { key:'fecha',        label:'Fecha',           w:100 },
                { key:'trabajador',   label:'Trabajador/a',    w:150 },
                { key:'departamento', label:'Departamento',    w:160 },
                { key:'zona',         label:'Zona',            w:130, opts:ZONA_OPTS },
                { key:'descripcion',  label:'Descripción',     w:280 },
                { key:'categoria',    label:'Categoría',       w:170, opts:['Mejora instalación','Equipamiento','Proceso interno','Experiencia cliente','Seguridad','Ahorro costes','Otro'] },
                { key:'prioridad',    label:'Prioridad',       w:140, opts:PRIO_OPTS },
                { key:'leido',        label:'Leído Dirección', w:170, opts:['✅ Leído','📬 Pendiente lectura','🔄 En revisión'] },
                { key:'valoracion',   label:'Valoración',      w:170, opts:['⭐⭐⭐ Excelente','⭐⭐ Buena','⭐ A estudiar','❌ Descartada','— Sin valorar'] },
                { key:'estado',       label:'Estado',          w:160, opts:['Pendiente','En estudio','Aprobada','En implementación','Implementada','Rechazada'] },
              ]}
              rows={data.propuestas}
              onEdit={(ri,k,v) => editRow('propuestas',ri,k,v)}
              onDelete={ri => delRow('propuestas',ri)}
              onAdd={r => addRow('propuestas',r)}
              emptyRow={{ id:nextId(data.propuestas,'PRO'), fecha:today, trabajador:'', departamento:'', zona:'', descripcion:'', categoria:'', prioridad:'🟡 Media', leido:'📬 Pendiente lectura', valoracion:'— Sin valorar', estado:'Pendiente' }}
            />
          </div>
        )}

        {/* CLASES */}
        {tab === 'clases' && (
          <div>
            <SectionHeader title="🏃 Incidencias — Clases Dirigidas" sub="Control de incidencias en actividades · Indoor 🏠 & Outdoor 🌳" color="#27AE60" />
            <DataTable color="#27AE60"
              cols={[
                { key:'id',          label:'ID',              w:90  },
                { key:'fecha',       label:'Fecha',           w:100 },
                { key:'zona',        label:'Zona',            w:120, opts:['Indoor 🏠','Outdoor 🌳'] },
                { key:'clase',       label:'Clase',           w:130, opts:['Spinning','Body pump','Yoga','Pilates','Zumba','CrossFit','GAP','Funcional','Aqua fitness','Boxeo','Otra'] },
                { key:'instructor',  label:'Instructor/a',    w:140 },
                { key:'horario',     label:'Horario',         w:110 },
                { key:'tipo',        label:'Tipo incidencia', w:170, opts:['Material averiado','Instructor ausente','Sala no disponible','Incidente usuario','Avería sonido/luz','Temperatura','Aforo','Otro'] },
                { key:'descripcion', label:'Descripción',     w:260 },
                { key:'prioridad',   label:'Prioridad',       w:140, opts:PRIO_OPTS },
                { key:'estado',      label:'Estado',          w:140, opts:['Pendiente','Gestionada','Resuelta','Cancelada clase'] },
                { key:'responsable', label:'Responsable',     w:120, opts:WORKERS },
              ]}
              rows={data.clases}
              onEdit={(ri,k,v) => editRow('clases',ri,k,v)}
              onDelete={ri => delRow('clases',ri)}
              onAdd={r => addRow('clases',r)}
              emptyRow={{ id:nextId(data.clases,'CLS'), fecha:today, zona:'', clase:'', instructor:'', horario:'', tipo:'', descripcion:'', prioridad:'🟡 Media', estado:'Pendiente', responsable:'' }}
            />
          </div>
        )}

        {/* SINGULAR */}
        {tab === 'singular' && (
          <div>
            <SectionHeader title="🌊 Zonas Singulares — Piscina & Sauna" sub="Registro de incidencias específicas de instalaciones especiales" color="#1565C0" />

            <div className="sing-block" style={{ borderColor:'#1565C0' }}>
              <div className="sing-ttl" style={{ background:'#1565C0' }}>🏊 PISCINA</div>
              <DataTable color="#1565C0"
                cols={[
                  { key:'id',          label:'ID',          w:90  },
                  { key:'fecha',       label:'Fecha',       w:100 },
                  { key:'tipo',        label:'Tipo',        w:160, opts:['Calidad agua','Temperatura','Filtración','Depuradora','Escalerillas','Iluminación','Acceso','Limpieza','Socorrista','Emergencia','Otro'] },
                  { key:'ubicacion',   label:'Ubicación',   w:150 },
                  { key:'descripcion', label:'Descripción', w:260 },
                  { key:'extra',       label:'pH/Cloro',    w:100 },
                  { key:'prioridad',   label:'Prioridad',   w:140, opts:PRIO_OPTS },
                  { key:'estado',      label:'Estado',      w:130, opts:['Pendiente','En curso','Resuelto','Cerrado'] },
                  { key:'responsable', label:'Responsable', w:120, opts:WORKERS },
                  { key:'obs',         label:'Observaciones',w:180 },
                ]}
                rows={data.piscina}
                onEdit={(ri,k,v) => editRow('piscina',ri,k,v)}
                onDelete={ri => delRow('piscina',ri)}
                onAdd={r => addRow('piscina',r)}
                emptyRow={{ id:nextId(data.piscina,'PIS'), fecha:today, tipo:'', ubicacion:'', descripcion:'', extra:'—', prioridad:'🟡 Media', estado:'Pendiente', responsable:'', obs:'' }}
              />
            </div>

            <div className="sing-block" style={{ borderColor:'#BF360C', marginTop:24 }}>
              <div className="sing-ttl" style={{ background:'#BF360C' }}>🔥 SAUNA</div>
              <DataTable color="#BF360C"
                cols={[
                  { key:'id',          label:'ID',          w:90  },
                  { key:'fecha',       label:'Fecha',       w:100 },
                  { key:'tipo',        label:'Tipo',        w:170, opts:['Temperatura','Calefacción/Resistencia','Vapor','Ventilación','Acceso/Puerta','Iluminación','Limpieza','Emergencia','Otro'] },
                  { key:'ubicacion',   label:'Ubicación',   w:150 },
                  { key:'descripcion', label:'Descripción', w:260 },
                  { key:'extra',       label:'Temp. (°C)',  w:100 },
                  { key:'prioridad',   label:'Prioridad',   w:140, opts:PRIO_OPTS },
                  { key:'estado',      label:'Estado',      w:130, opts:['Pendiente','En curso','Resuelto','Cerrado'] },
                  { key:'responsable', label:'Responsable', w:120, opts:WORKERS },
                  { key:'obs',         label:'Observaciones',w:180 },
                ]}
                rows={data.sauna}
                onEdit={(ri,k,v) => editRow('sauna',ri,k,v)}
                onDelete={ri => delRow('sauna',ri)}
                onAdd={r => addRow('sauna',r)}
                emptyRow={{ id:nextId(data.sauna,'SAU'), fecha:today, tipo:'', ubicacion:'', descripcion:'', extra:'—', prioridad:'🟡 Media', estado:'Pendiente', responsable:'', obs:'' }}
              />
            </div>
          </div>
        )}

        {/* TAREAS */}
        {tab === 'tareas' && (
          <div>
            <SectionHeader title="👥 Panel de Tareas por Trabajador" sub="Tareas pendientes asignadas automáticamente desde todas las secciones" color="#1A1A2E" />
            {WORKERS.filter(w => w !== '-').map(worker => {
              const c = WORKER_COLORS[worker] || '#546E7A'
              const tasks = [
                ...data.incidencias.filter(r => r.responsable===worker && !['Resuelta','Cancelada','Finalizado'].includes(r.estado)).map(r => ({...r, origen:'📋 Incidencias'})),
                ...data.maquinas.filter(r => r.responsable===worker && !['Reparada','Baja/Retirada'].includes(r.estado)).map(r => ({...r, origen:'🔧 Máquinas'})),
                ...data.instalaciones.filter(r => r.responsable===worker && !['Finalizado','Cancelado'].includes(r.estado)).map(r => ({...r, origen:'🏗️ Instalaciones'})),
                ...data.tapizado.filter(r => r.responsable===worker && !['Reparado','Sustituido'].includes(r.estado)).map(r => ({...r, descripcion:r.maquina, origen:'🪑 Tapizado'})),
                ...data.clases.filter(r => r.responsable===worker && !['Resuelta','Cancelada clase','Gestionada'].includes(r.estado)).map(r => ({...r, origen:'🏃 Clases'})),
                ...data.piscina.filter(r => r.responsable===worker && !['Resuelto','Cerrado'].includes(r.estado)).map(r => ({...r, origen:'🌊 Piscina'})),
                ...data.sauna.filter(r => r.responsable===worker && !['Resuelto','Cerrado'].includes(r.estado)).map(r => ({...r, origen:'🔥 Sauna'})),
              ]
              return (
                <div key={worker} className="t-block">
                  <div className="t-hdr" style={{ background: c }}>
                    👤 {worker.toUpperCase()} — {tasks.length} tarea{tasks.length!==1?'s':''} pendiente{tasks.length!==1?'s':''}
                  </div>
                  {tasks.length === 0
                    ? <div className="t-empty">✅ Sin tareas pendientes</div>
                    : (
                      <div className="tbl-scroll">
                        <table className="tbl">
                          <thead>
                            <tr>
                              {['Origen','ID','Fecha','Descripción','Estado','Prioridad'].map(h => (
                                <th key={h} style={{ background: c }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {tasks.map((r, i) => (
                              <tr key={i} className={i%2===0?'r-alt':'r-plain'}>
                                <td className="td"><span className="orig-badge" style={{background:c+'22',color:c}}>{r.origen}</span></td>
                                <td className="td mono">{r.id}</td>
                                <td className="td">{r.fecha}</td>
                                <td className="td td-desc">{r.descripcion}</td>
                                <td className={`td ${statusClass(r.estado)}`}>{r.estado}</td>
                                <td className={`td ${prioClass(r.prioridad)}`}>{r.prioridad}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  }
                </div>
              )
            })}
          </div>
        )}

      </main>
    </div>
  )
}
