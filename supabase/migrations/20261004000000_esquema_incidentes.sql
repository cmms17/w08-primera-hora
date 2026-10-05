-- Esquema de Primera Hora (w08). Ninguna fila guarda un dato real de
-- paciente ni la contraseña de prueba en texto plano: el chequeo contra
-- filtraciones se hace por k-anonimato (solo un prefijo de hash sale del
-- servidor hacia la API de Pwned Passwords) y el resultado se guarda como
-- booleano, nunca el valor.

create table if not exists incidentes (
  id uuid primary key default gen_random_uuid(),
  alias_reportante text not null,
  sistema_afectado text not null,
  tipo_dato text not null,
  descripcion text not null,
  password_revisada boolean not null default false,
  password_comprometida boolean,
  severidad text,
  checklist text,
  borrador_aviso text,
  creado_en timestamptz not null default now(),
  confirmado_en timestamptz,
  contenido_en timestamptz,
  aviso_enviado_en timestamptz,
  retirado boolean not null default false
);

create index if not exists idx_incidentes_creado on incidentes(creado_en desc);

-- RLS activado, sin policies para anon/authenticated: toda lectura y
-- escritura pasa por el servidor con la Service Role Key
-- (crearClienteSupabaseServidor). No existe ningún endpoint público que
-- liste incidentes.
alter table incidentes enable row level security;
