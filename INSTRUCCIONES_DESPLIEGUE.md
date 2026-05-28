# 🏋️ GYM INCIDENCIAS — Guía de despliegue

Sigue estos pasos **en orden**. Todo es gratuito.

---

## PASO 1 — Crear la base de datos en Supabase

1. Ve a **https://supabase.com** y crea una cuenta gratuita
2. Haz clic en **"New Project"**
   - Ponle un nombre: `gym-incidencias`
   - Elige una contraseña (guárdala)
   - Región: **West EU (Ireland)** — la más cercana a España
3. Espera ~2 minutos a que se cree el proyecto
4. Ve al menú izquierdo → **SQL Editor** → **New Query**
5. Copia TODO el contenido del archivo `supabase_schema.sql`
6. Pégalo en el editor y haz clic en **"Run"** (botón verde)
   - Verás "Success" si todo va bien

### Obtener las credenciales de Supabase
7. Ve al menú izquierdo → **Settings** → **API**
8. Copia estos dos valores (los necesitarás en el Paso 3):
   - **Project URL** → es tu `VITE_SUPABASE_URL`
   - **anon / public key** → es tu `VITE_SUPABASE_ANON_KEY`

---

## PASO 2 — Subir el código a GitHub

1. Ve a **https://github.com** y crea una cuenta gratuita
2. Haz clic en **"New repository"**
   - Nombre: `gym-incidencias`
   - Selecciona **Public** (o Private, ambas funcionan con Vercel gratis)
   - Haz clic en **"Create repository"**
3. En tu ordenador, instala **Git** si no lo tienes: https://git-scm.com
4. Abre una terminal (símbolo del sistema) en la carpeta `gym-app` y ejecuta:

```bash
git init
git add .
git commit -m "Primera versión gym incidencias"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/gym-incidencias.git
git push -u origin main
```
   *(Cambia TU_USUARIO por tu usuario de GitHub)*

---

## PASO 3 — Desplegar en Vercel

1. Ve a **https://vercel.com** y crea una cuenta gratuita
   - Lo más fácil: **"Continue with GitHub"** (usa tu cuenta de GitHub)
2. Haz clic en **"New Project"**
3. Selecciona el repositorio **gym-incidencias** de la lista
4. Vercel detectará automáticamente que es un proyecto Vite/React
5. **IMPORTANTE** — Antes de hacer clic en Deploy, añade las variables de entorno:
   - Haz clic en **"Environment Variables"**
   - Añade:
     - `VITE_SUPABASE_URL` → pega tu Project URL de Supabase
     - `VITE_SUPABASE_ANON_KEY` → pega tu anon key de Supabase
6. Haz clic en **"Deploy"**
7. Espera ~1 minuto
8. ✅ Vercel te dará una URL tipo: `https://gym-incidencias-abc123.vercel.app`

---

## PASO 4 — Usar la app

- **Abre la URL** en cualquier navegador, en cualquier ordenador de la instalación
- Los datos se guardan automáticamente en Supabase y se sincronizan en **tiempo real** entre todos los ordenadores
- Si cambias algo en un ordenador, el resto lo verán al instante (sin recargar)
- Para añadir un acceso directo en el escritorio: en Chrome → menú ⋮ → "Más herramientas" → "Crear acceso directo"

---

## Actualizaciones futuras

Si quieres hacer cambios en la app, edita los archivos, y ejecuta:
```bash
git add .
git commit -m "Descripción del cambio"
git push
```
Vercel desplegará automáticamente la nueva versión.

---

## ¿Necesitas ayuda?

Si tienes algún problema en algún paso, díselo a Claude con el mensaje de error exacto y te guiará.
