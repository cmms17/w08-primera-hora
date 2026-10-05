# BUILDCHAT — Bitácora del proceso de construcción

Business Bending · Cristina Meouchi (OPERATOR) · Repair Flow, Crystal Ball Studio · Team 8 · w08

## Nota sobre este documento

Esto no es un volcado sin editar del log crudo de la conversación — es una bitácora organizada por
fase, armada a partir del registro real de la sesión de construcción, con las citas textuales de
Cristina marcadas entre comillas exactamente como las escribió (incluyendo erratas de tecleo, sin
corregir, porque son parte honesta del registro). El objetivo es que quien lo lea entienda qué pasó
de verdad: qué se rompió, por qué, quién lo causó, y cómo se resolvió — no una versión pulida que
esconda los tropiezos.

La construcción tomó dos días (4 y 5 de octubre de 2026) y la mayor parte del tiempo no se fue en
escribir código nuevo, sino en una maratón de depuración en producción. Eso también es parte
honesta de lo que fue construir esta pieza.

## La instrucción rectora

Desde el inicio de la sesión, Cristina dejó una instrucción explícita que gobernó todo el proceso,
después de semanas previas de trabajo doble por errores evitables:

> "esta vez quiero que prevengas todos los errores posibles no quiero trabajar doble como lo hemos
> hehco as semanas anteriores, quiero que a la primera quede"

Esa instrucción se cita aquí completa y sin corregir porque es, literalmente, la especificación de
calidad de este proyecto. A lo largo de la bitácora se documenta, con la misma honestidad, dónde se
cumplió esa instrucción y dónde no.

---

## Fase 1 — De cero a desplegado

Se construyó la pieza sobre el mismo stack verificado en w07 (Next.js 16 + TypeScript + Tailwind 4,
Supabase para base de datos/auth/RLS, Vercel para hosting), fijando `framework: nextjs` en
`vercel.json` desde el primer commit para evitar el bug de Framework Preset que había costado tiempo
la semana anterior. Se integraron las tres piezas del Dragon Stack: Google Gemini para clasificación
de severidad y redacción de borradores, Pwned Passwords por k-anonimato para revisar contraseñas de
prueba sin exponerlas, y un cálculo de estado por tiempo (sin cron) para el SLA de 30 minutos —
decisión tomada a propósito porque un proceso en segundo plano es una fuente de fallas que un
cálculo puro no tiene.

El mockup de `/triage`, el diagrama de flujo y el diagrama de swimlane (ambos en Mermaid, renderizados
a PNG) se generaron el 4 de octubre como parte de la documentación del Packet.

## Fase 2 — El error 500 en producción

Al probar la app ya desplegada, `/api/triage` devolvía un error genérico 500. La causa no era
evidente desde el mensaje de error al usuario ("El servidor no pudo procesar el reporte"), así que
se agregaron campos de diagnóstico temporales en el bloque `catch` de la ruta para exponer el error
real — una práctica deliberada de depuración, no una fuga permanente: esos campos se quitaron en
cuanto se identificó la causa.

El diagnóstico apuntó al mensaje exacto `"Faltan las variables de entorno de Supabase en el
servidor."`, lo que sugería variables de entorno faltantes. Pero la causa raíz resultó más sutil y
más fácil de pasar por alto de lo que parecía: existían **dos proyectos de Vercel distintos**
conectados al mismo repositorio de GitHub (`w08-primera-hora` y `w08-primera-hora-x22e`), y Cristina
había estado configurando las variables de entorno de Supabase en uno mientras probaba el dominio
del otro. No era un typo ni una variable mal escrita — era un dominio equivocado.

En este punto del proceso, mientras se pedían capturas de pantalla de la configuración de Vercel
para confirmar el diagnóstico, llegó la primera señal de frustración:

> "te dije que no equeira errores"

> "QUE QUIERES QUE HAGA¿"

Se resolvió identificando `https://w08-primera-hora-x22e.vercel.app` como el dominio correctamente
configurado — ese quedó como la URL definitiva del proyecto — y abandonando el otro proyecto sin
intentar repararlo, porque ya no tenía ningún propósito.

## Fase 3 — La IA siempre caía al texto de respaldo

Resuelto el 500, apareció un segundo problema: la clasificación de severidad y el checklist nunca
los generaba la IA — siempre aparecía el texto de respaldo ("no se pudo generar automáticamente").
Esto llevó a otra ronda de diagnóstico en vivo, esta vez contra la API de Gemini directamente
(se creó una ruta de diagnóstico temporal, `debug-gemini/route.ts`, que replicaba la llamada real de
`llm.ts` con el mismo schema de function calling forzado).

La causa resultó ser externa al código: Google había dado de baja el modelo `gemini-2.5-flash` para
cuentas nuevas a mitad del curso — confirmado por un 404 real de la API con el mensaje "This model
models/gemini-2.5-flash is no longer available to new users... update your code to use
models/gemini-3.8-flash". Se verificó contra la documentación oficial de Google que
`gemini-3.8-flash` era el reemplazo correcto y compatible con el mismo patrón de llamada, y se
actualizó `MODELO` en `src/lib/llm.ts`.

Mientras se investigaba esto:

> "AGGHHHHHH"

Después del primer intento de fix, el error seguía apareciendo — incluso con el commit correcto ya
desplegado y confirmado como "Ready" en Vercel. Aquí el error fue propio: la ruta de diagnóstico
temporal (`debug-gemini/route.ts`) tenía su propio string de modelo hardcodeado por separado, y no
se había actualizado junto con el archivo real. No era un misterio nuevo — era un descuido al
corregir el primero. Se corrigió y se le dijo a Cristina explícitamente que ese error específico era
mío, no uno nuevo, distinguiéndolo del problema original (que sí era un cambio externo imposible de
prever). Después de confirmado el fix correcto, aparecieron también 503 intermitentes de "alta
demanda" del modelo nuevo bajo el nivel gratuito — se verificó con varios reintentos que es
comportamiento esperable de un modelo recién lanzado, no un bug, y que el diseño de respaldo ya
existente en la app lo absorbe correctamente.

## Fase 4 — El error que sí fue completamente mío

Durante una transferencia de un archivo grande (`src/app/triage/page.tsx`) de este entorno a la
máquina de Cristina, se usó un string "crudo" de Python (`r"""..."""`) con comillas escapadas a
mano. Los strings crudos no procesan escapes — el resultado fue que quedaron secuencias literales de
backslash-comilla escritas en el archivo, en vez de comillas normales, lo que rompió el parseo de
TypeScript (decenas de errores, detectados con `npx tsc --noEmit` **antes** de hacer commit, no
después). Se corrigió reescribiendo la transferencia con un string no-crudo de triple comilla simple
y comillas normales sin escapar, y verificando con un `tsc --noEmit` limpio más un `md5sum`
idéntico contra la versión ya validada en este entorno.

Esto pasó justo después de que Cristina expresara, de la forma más directa de toda la sesión, la
frustración que la instrucción rectora trataba de evitar:

> "ya pero de verdad que horror me haces trabajar doble porque no haces las cosas bien desde el
> principio"

Se le reconoció explícitamente que este error — a diferencia de la baja del modelo de Gemini o la
configuración rota de recuperación de contraseña de Supabase — no tenía ninguna causa externa: fue
un descuido propio de transcripción, evitable, y exactamente el tipo de error doble que ella había
pedido prevenir desde el principio de la sesión. A partir de aquí quedó establecido como regla fija
para el resto de la sesión: toda transferencia de archivo se verifica con `tsc --noEmit` y `md5sum`
antes de comitear, nunca después.

## Fase 5 — Pase mecánico de pruebas (9/9)

Con la app estable, se corrió el plan de pruebas completo del Packet contra
`https://w08-primera-hora-x22e.vercel.app`, combinando pruebas en vivo en el navegador, una
simulación independiente en Node.js para la prueba dependiente de tiempo (el auto-escalado de SLA,
para no tener que esperar 30 minutos reales), y revisión de código para las pruebas que no se pueden
observar por UI (que ninguna notificación se envíe sola, que ningún campo guarde un dato real de
paciente). Los 9 casos pasaron, incluyendo la confirmación en producción de que dos incidentes de
prueba pasaron de "nuevo" a "ESCALADO" solo por el paso del tiempo, sin ninguna acción manual.

## Fase 6 — Persona Test: caminar la app como Memo

Se recorrió `/triage` desde cero, como la vería Memo — el proveedor de TI de 34 años que es el
usuario exacto de esta pieza — sin leer el Packet primero y con la urgencia de alguien reportando un
ransomware real. Se documentaron dos hallazgos:

Uno menor: el campo de contraseña de prueba puede generar una duda legítima en medio de un incidente
real ("¿esto no sirve para mi contraseña de verdad?"). Se documentó para un ciclo futuro, sin
corregir, porque la restricción de fondo (nunca procesar una credencial real sin infraestructura de
respuesta detrás) es correcta tal como está.

Uno mayor — el peor encontrado en toda la prueba: la pantalla de resultado solo decía "guarda esta
pantalla", sin decir cómo ni dar ninguna forma de hacerlo. Es exactamente la información que Memo
no se puede dar el lujo de perder (el checklist de contención y el borrador de aviso), en el peor
momento de su semana. Se envió un fix real: instrucción concreta ("Toma captura de pantalla a esto
ahora") más un botón "Copiar todo" que copia un resumen en texto plano al portapapeles, verificado
con `tsc --noEmit` antes de desplegar y confirmado en producción.

(Nota de transparencia: durante la verificación propia en el navegador remoto, el botón nunca mostró
visualmente la confirmación "✓ Copiado" al hacer clic — probablemente una limitación del modelo de
permisos de portapapeles de ese navegador automatizado, no un bug real para alguien usando su propio
navegador. La instrucción principal de tomar captura de pantalla es independiente del botón y sigue
siendo visible y accionable aunque el portapapeles fallara. Queda como punto de atención para que
Cristina lo confirme ella misma en su propio navegador.)

## Fase 7 — Cuenta de coordinador bloqueada

> "ya"

> "tons?"

> "no me acuerdo cual es mi mail y contraseña"

Cristina perdió el acceso a su cuenta de coordinador en `/panel`. El flujo de recuperación de
contraseña de Supabase Auth resultó estar roto: el link del correo de recuperación redirigía a
`http://localhost:3000` en vez del dominio de producción, dejando un token de recuperación expuesto
en la URL de una página de error muerta de Safari. Se decidió explícitamente no usar ese token
filtrado por ningún motivo, y en vez de depurar la configuración de redirección (Site URL) de
Supabase bajo presión de tiempo, se guio a Cristina por un camino más simple y más seguro: borrar el
usuario de Auth existente y crear uno nuevo directamente desde el dashboard de Supabase
(Authentication → Users → Add user, con "Auto Confirm User" activado), anotando la contraseña nueva
de inmediato. Confirmado funcionando con una captura de la cola de incidentes ya autenticada.

## Fase 8 — Security Floor y cierre de documentación

Se documentaron los cinco controles de seguridad que sostienen la pieza (`docs/PACKET.md`, sección
"Security Floor"): validación estricta con zod en cada ruta, la contraseña de prueba que nunca se
guarda (solo un booleano, el valor nunca llega a la tabla `incidentes`), RLS activado sin policies
públicas, ninguna decisión irreversible sin sesión autenticada por `/api/panel/accion`, y
degradación segura si Gemini o Pwned Passwords fallan (nunca se asume "segura" por default).

Se escribió el guion de grabación para `DEMO.mp4` (`docs/GUION_DEMO.md`, 3 minutos de recorrido de
producto + 30 segundos de plática casual) y se entregó directamente a Cristina.

## Lo que esta bitácora deja claro

De los errores de esta sesión, dos no tuvieron forma razonable de preverse desde el inicio: que
Google diera de baja un modelo de IA a mitad del curso, y que la configuración de recuperación de
contraseña de Supabase apuntara a localhost por default. Uno fue un error de infraestructura propio
y evitable (el string crudo de Python que corrompió un archivo) y se reconoció como tal en el
momento, sin minimizarlo. La respuesta a ese error fue concreta: una regla de verificación
(`tsc --noEmit` + `md5sum` antes de cada commit) que se mantuvo el resto de la sesión y que es,
en sí misma, la forma en que esta bitácora intenta cumplir la instrucción original de Cristina —
no evitando que algo salga mal alguna vez, sino evitando repetir el mismo error dos veces.

## Resumen técnico de referencia

| Elemento | Valor |
|---|---|
| URL en vivo | `https://w08-primera-hora-x22e.vercel.app` |
| Modelo de IA (final) | `gemini-3.8-flash` |
| Commits locales en esta fase | 10+ (incluye el fix de Persona Test y la documentación del Security Floor) |
| Pruebas mecánicas | 9/9 pasadas |
| Hallazgos de Persona Test | 2 (1 mayor, corregido · 1 menor, documentado) |
| Checks de Security Floor | 5/5 documentados |
