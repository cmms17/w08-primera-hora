# Primera Hora (w08)

Triage de incidentes de brecha para el proveedor de TI de una pyme — Week 8, Business Bending
(OPERATOR). Ver `docs/PACKET.md` para el diseño completo.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind 4 + Supabase (Postgres, Auth, RLS) + Vercel.
Dragon Stack: Google Gemini API (clasificación + borrador) + Pwned Passwords API
(k-anonimato) + automatización por cálculo de tiempo (SLA de 30 min, sin cron).

## Desarrollo local

```bash
cp .env.example .env.local   # llena tus propias claves, nunca las subas
npm install
npm run dev
```

## Variables de entorno (solo en Vercel, nunca en el repo)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
