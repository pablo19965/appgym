-- ══════════════════════════════════════════════════════════════
-- GYM INCIDENCIAS — Schema para Supabase
-- Ejecuta este SQL en: Supabase > SQL Editor > New Query
-- ══════════════════════════════════════════════════════════════

-- INCIDENCIAS GENERALES
CREATE TABLE IF NOT EXISTS incidencias (
  id          TEXT PRIMARY KEY,
  fecha       TEXT,
  zona        TEXT,
  area        TEXT,
  categoria   TEXT,
  descripcion TEXT,
  estado      TEXT DEFAULT 'Abierta',
  prioridad   TEXT DEFAULT '🟡 Media',
  responsable TEXT,
  obs         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- MÁQUINAS
CREATE TABLE IF NOT EXISTS maquinas (
  id          TEXT PRIMARY KEY,
  fecha       TEXT,
  zona        TEXT,
  nombre      TEXT,
  descripcion TEXT,
  prioridad   TEXT DEFAULT '🟡 Media',
  estado      TEXT DEFAULT 'Pendiente',
  responsable TEXT,
  obs         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- INSTALACIONES
CREATE TABLE IF NOT EXISTS instalaciones (
  id          TEXT PRIMARY KEY,
  fecha       TEXT,
  zona        TEXT,
  area        TEXT,
  descripcion TEXT,
  prioridad   TEXT DEFAULT '🟡 Media',
  estado      TEXT DEFAULT 'Pendiente',
  responsable TEXT,
  obs         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- MATERIAL
CREATE TABLE IF NOT EXISTS material (
  id          TEXT PRIMARY KEY,
  fecha       TEXT,
  zona        TEXT,
  articulo    TEXT,
  categoria   TEXT,
  estado      TEXT DEFAULT 'Pendiente',
  cantidad    INTEGER DEFAULT 1,
  unidad      TEXT DEFAULT 'ud',
  obs         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- TAPIZADO
CREATE TABLE IF NOT EXISTS tapizado (
  id          TEXT PRIMARY KEY,
  fecha       TEXT,
  zona        TEXT,
  maquina     TEXT,
  zona_tap    TEXT,
  deterioro   TEXT,
  prioridad   TEXT DEFAULT '🟡 Media',
  estado      TEXT DEFAULT 'Pendiente',
  responsable TEXT,
  obs         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- SUGERENCIAS
CREATE TABLE IF NOT EXISTS sugerencias (
  id          TEXT PRIMARY KEY,
  fecha       TEXT,
  zona        TEXT,
  categoria   TEXT,
  descripcion TEXT,
  veces       INTEGER DEFAULT 1,
  prioridad   TEXT DEFAULT '🟡 Media',
  estado      TEXT DEFAULT 'Pendiente',
  respuesta   TEXT,
  responsable TEXT,
  obs         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- PROPUESTAS
CREATE TABLE IF NOT EXISTS propuestas (
  id            TEXT PRIMARY KEY,
  fecha         TEXT,
  trabajador    TEXT,
  departamento  TEXT,
  zona          TEXT,
  descripcion   TEXT,
  categoria     TEXT,
  prioridad     TEXT DEFAULT '🟡 Media',
  leido         TEXT DEFAULT '📬 Pendiente lectura',
  valoracion    TEXT DEFAULT '— Sin valorar',
  estado        TEXT DEFAULT 'Pendiente',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- CLASES DIRIGIDAS
CREATE TABLE IF NOT EXISTS clases (
  id          TEXT PRIMARY KEY,
  fecha       TEXT,
  zona        TEXT,
  clase       TEXT,
  instructor  TEXT,
  horario     TEXT,
  tipo        TEXT,
  descripcion TEXT,
  prioridad   TEXT DEFAULT '🟡 Media',
  estado      TEXT DEFAULT 'Pendiente',
  responsable TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- PISCINA
CREATE TABLE IF NOT EXISTS piscina (
  id          TEXT PRIMARY KEY,
  fecha       TEXT,
  tipo        TEXT,
  ubicacion   TEXT,
  descripcion TEXT,
  extra       TEXT,
  prioridad   TEXT DEFAULT '🟡 Media',
  estado      TEXT DEFAULT 'Pendiente',
  responsable TEXT,
  obs         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- SAUNA
CREATE TABLE IF NOT EXISTS sauna (
  id          TEXT PRIMARY KEY,
  fecha       TEXT,
  tipo        TEXT,
  ubicacion   TEXT,
  descripcion TEXT,
  extra       TEXT,
  prioridad   TEXT DEFAULT '🟡 Media',
  estado      TEXT DEFAULT 'Pendiente',
  responsable TEXT,
  obs         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Habilitar Row Level Security (acceso público de lectura/escritura) ─────────
ALTER TABLE incidencias   ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE instalaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE material      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tapizado      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sugerencias   ENABLE ROW LEVEL SECURITY;
ALTER TABLE propuestas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE clases        ENABLE ROW LEVEL SECURITY;
ALTER TABLE piscina       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sauna         ENABLE ROW LEVEL SECURITY;

-- Políticas: acceso total sin login (red local del gimnasio)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['incidencias','maquinas','instalaciones','material',
                            'tapizado','sugerencias','propuestas','clases','piscina','sauna']
  LOOP
    EXECUTE format('CREATE POLICY "allow_all_%s" ON %s FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- ── Habilitar Realtime en todas las tablas ─────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE incidencias;
ALTER PUBLICATION supabase_realtime ADD TABLE maquinas;
ALTER PUBLICATION supabase_realtime ADD TABLE instalaciones;
ALTER PUBLICATION supabase_realtime ADD TABLE material;
ALTER PUBLICATION supabase_realtime ADD TABLE tapizado;
ALTER PUBLICATION supabase_realtime ADD TABLE sugerencias;
ALTER PUBLICATION supabase_realtime ADD TABLE propuestas;
ALTER PUBLICATION supabase_realtime ADD TABLE clases;
ALTER PUBLICATION supabase_realtime ADD TABLE piscina;
ALTER PUBLICATION supabase_realtime ADD TABLE sauna;

-- ── Datos de ejemplo ───────────────────────────────────────────────────────────
INSERT INTO incidencias (id,fecha,zona,area,categoria,descripcion,estado,prioridad,responsable,obs) VALUES
  ('INC-001','01/04/2025','Indoor 🏠','Sala musculación','Máquina','Cable de polea roto','Resuelta','🟠 Alta','Arturo',''),
  ('INC-002','10/04/2025','Outdoor 🌳','Zona cardio exterior','Instalación','Banco dañado por lluvia','En curso','🟡 Media','Mario',''),
  ('INC-003','15/04/2025','Indoor 🏠','Vestuarios','Material','Falta jabón dispensador','Abierta','🟢 Baja','Guildo',''),
  ('INC-004','18/04/2025','Indoor 🏠','Sala spinning','Máquina','Bicicleta hace ruido al pedalear','Abierta','🟠 Alta','José',''),
  ('INC-005','20/04/2025','Outdoor 🌳','Ducha exterior','Instalación','Grifo sin agua caliente','Pendiente','🔴 URGENTE','Arturo','URGENTE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO maquinas (id,fecha,zona,nombre,descripcion,prioridad,estado,responsable,obs) VALUES
  ('MAQ-001','08/04/2025','Indoor 🏠','Cinta correr A-03','Motor hace ruido excesivo','🟠 Alta','En reparación','Arturo',''),
  ('MAQ-002','18/04/2025','Indoor 🏠','Bicicleta spinning B-05','Ruido al pedalear','🟠 Alta','Pendiente','Mario',''),
  ('MAQ-003','10/04/2025','Outdoor 🌳','Elíptica E-01','Pedal derecho suelto — peligro caída','🔴 URGENTE','Pendiente','Guildo','Zona precintada'),
  ('MAQ-004','01/04/2025','Indoor 🏠','Multifuerza MF-02','Cable roto poleas','🟠 Alta','Reparada','José','')
ON CONFLICT (id) DO NOTHING;

INSERT INTO instalaciones (id,fecha,zona,area,descripcion,prioridad,estado,responsable,obs) VALUES
  ('INS-001','05/04/2025','Indoor 🏠','Vestuario masculino','Gotera en techo ducha','🟠 Alta','En curso','Arturo',''),
  ('INS-002','12/04/2025','Outdoor 🌳','Parking exterior','Farola nº3 sin luz','🟡 Media','Pendiente','Mario',''),
  ('INS-003','08/04/2025','Indoor 🏠','Sala cycling','Aire acondicionado no enfría','🟠 Alta','Pendiente','Guildo',''),
  ('INS-004','20/03/2025','Outdoor 🌳','Zona verde','Seto delimitador dañado','🟢 Baja','Finalizado','José','')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tapizado (id,fecha,zona,maquina,zona_tap,deterioro,prioridad,estado,responsable,obs) VALUES
  ('TAP-001','05/04/2025','Indoor 🏠','Banco pesas B-02','Asiento principal','Grave','🟠 Alta','Pendiente','Arturo',''),
  ('TAP-002','12/04/2025','Indoor 🏠','Camilla estiramientos','Toda la superficie','Moderado','🟡 Media','Pendiente','Mario',''),
  ('TAP-003','20/04/2025','Outdoor 🌳','Banco exterior pad','Respaldo','Muy grave','🔴 URGENTE','En reparación','José','URGENTE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sugerencias (id,fecha,zona,categoria,descripcion,veces,prioridad,estado,respuesta,responsable,obs) VALUES
  ('SUG-001','02/04/2025','Indoor 🏠','Temperatura','Hace demasiado calor en sala',8,'🟠 Alta','En revisión','Revisado termostato','Arturo',''),
  ('SUG-002','10/04/2025','Indoor 🏠','Música','La música está demasiado alta',12,'🟡 Media','Pendiente','','Guildo',''),
  ('SUG-003','14/04/2025','Outdoor 🌳','Equipamiento','Faltan mancuernas ligeras outdoor',3,'🟡 Media','Implementada','Adquiridas','José','')
ON CONFLICT (id) DO NOTHING;

INSERT INTO propuestas (id,fecha,trabajador,departamento,zona,descripcion,categoria,prioridad,leido,valoracion,estado) VALUES
  ('PRO-001','03/04/2025','Ana Ruiz','Monitor fitness','Indoor 🏠','Instalar espejos en zona funcional','Mejora instalación','🟡 Media','✅ Leído','⭐⭐ Buena','En estudio'),
  ('PRO-002','09/04/2025','Miguel Soto','Mantenimiento','Outdoor 🌳','Toldo en zona cardio outdoor','Mejora instalación','🟠 Alta','✅ Leído','⭐⭐⭐ Excelente','Aprobada'),
  ('PRO-003','15/04/2025','Laura Gil','Recepción','General','Reserva online para máquinas','Proceso interno','🟠 Alta','📬 Pendiente lectura','— Sin valorar','Pendiente')
ON CONFLICT (id) DO NOTHING;

INSERT INTO clases (id,fecha,zona,clase,instructor,horario,tipo,descripcion,prioridad,estado,responsable) VALUES
  ('CLS-001','07/04/2025','Indoor 🏠','Spinning','Paco M.','07:30-08:30','Avería sonido/luz','Sistema de sonido no funciona','🟡 Media','Resuelta','Arturo'),
  ('CLS-002','14/04/2025','Indoor 🏠','Body pump','Ana Ruiz','10:00-11:00','Material averiado','3 barras de body pump dañadas','🟠 Alta','Gestionada','Mario'),
  ('CLS-003','21/04/2025','Indoor 🏠','Yoga','Sara N.','19:00-20:00','Incidente usuario','Clienta se lesiona tobillo','🔴 URGENTE','Resuelta','José')
ON CONFLICT (id) DO NOTHING;

INSERT INTO piscina (id,fecha,tipo,ubicacion,descripcion,extra,prioridad,estado,responsable,obs) VALUES
  ('PIS-001','06/04/2025','Calidad agua','Vaso principal','pH fuera de rango — agua turbia','pH 8.9','🔴 URGENTE','Resuelto','Arturo','Cerrado 4h'),
  ('PIS-002','13/04/2025','Temperatura','Vaso completo','Temperatura baja a 24°C','—','🟠 Alta','En curso','Mario',''),
  ('PIS-003','22/04/2025','Limpieza','Vestuario piscina','Suelo muy resbaladizo','—','🟡 Media','Pendiente','José','')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sauna (id,fecha,tipo,ubicacion,descripcion,extra,prioridad,estado,responsable,obs) VALUES
  ('SAU-001','09/04/2025','Temperatura','Sauna principal','Temperatura no sube de 70°C','70°C','🟠 Alta','Resuelto','Arturo',''),
  ('SAU-002','17/04/2025','Vapor','Sauna de vapor','Generador de vapor no funciona','—','🟠 Alta','En curso','Mario',''),
  ('SAU-003','23/04/2025','Emergencia','Sauna principal','Usuario con mareo — emergencia','90°C','🔴 URGENTE','Resuelto','José','Usuario asistido')
ON CONFLICT (id) DO NOTHING;
