# Med-IA

Sistema web de **orientación médica (triage) con inteligencia artificial**. El paciente describe sus
síntomas en lenguaje natural; la IA hace preguntas de seguimiento, asigna un nivel de urgencia
(semáforo), sugiere la especialidad y muestra médicos de esa especialidad. **No es un diagnóstico.**

Proyecto de Ingeniería de Software · Universidad Católica Boliviana · 4 sprints · 70 historias de usuario.

## Tecnologías

| Parte    | Stack |
|----------|-------|
| Backend  | Node.js · Express · TypeScript · Prisma 5 · PostgreSQL (Supabase) · OpenAI · Nodemailer |
| Frontend | Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Axios · jsPDF |

```
Proyecto-Med-IA/
├── backend/    API REST (puerto 3001)
└── frontend/   Aplicación web (puerto 3000)
```

## Roles y funcionalidades

- **Paciente anónimo**: triage completo sin cuenta, con el mismo límite diario (por sesión/IP) e invitación a registrarse.
- **Paciente registrado**: registro con verificación de correo, login con bloqueo tras 5 intentos fallidos,
  recuperación de contraseña, triage con historial como contexto, confirmación del resumen antes del resultado,
  reiniciar o cancelar la consulta, especialidades alternativas, historial con filtros, detalle, paginación,
  PDF y eliminación de consultas, correo con el resultado (desactivable), editar nombre, correo y contraseña,
  y eliminar su cuenta.
- **Médico**: panel propio, perfil y foto, disponibilidad, estadísticas de derivaciones, cambio de contraseña
  y verificación en dos pasos con códigos de recuperación.
- **Administrador**: dashboard (consultas recientes por urgencia, gráficos, estadísticas por período con
  exportación CSV/PDF, ranking de médicos), consultas con filtros y exportación, usuarios (búsqueda, orden,
  paginación, exportación, activar/desactivar, historial auditado), médicos, especialidades, límite diario
  y registro de accesos.

## Puesta en marcha

Requisitos: Node.js 18 o superior y acceso a la base de datos del equipo.

### Backend

```bash
cd backend
cp .env.example .env          # completar los valores (ver tabla de abajo)
npm install
npx prisma generate
npx prisma migrate status     # ver si falta aplicar alguna migración
npm run dev                   # http://localhost:3001  (GET /health responde "ok")
```

**Base compartida del equipo**: nunca correr `prisma migrate dev` ni `migrate reset` sobre ella (puede
pedir borrar los datos). Si `migrate status` muestra migraciones pendientes, una sola persona ejecuta
`npx prisma migrate deploy`, que solo aplica las que faltan y no borra nada.

**Base nueva y vacía** (por ejemplo, local): `npx prisma migrate deploy` y luego `npm run db:seed`.

### Frontend

```bash
cd frontend
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev                        # http://localhost:3000
```

### Variables de entorno del backend

| Variable | Para qué |
|----------|----------|
| `DATABASE_URL`, `DIRECT_URL` | Conexión a PostgreSQL (Supabase → Connect → ORMs → Prisma) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Firma de las sesiones (una cadena larga y aleatoria) |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Análisis de síntomas con la IA |
| `IA_MODO_SIMULADO` | `true` = IA simulada, sin gastar créditos (útil para desarrollar y para la demo) |
| `FRONTEND_URL` | CORS y enlaces de los correos |
| `TRUST_PROXY` | Cantidad de proxies delante del backend: `0` en local, `1` en Render (para que las IP de Accesos sean las reales) |
| `BREVO_API_KEY` | Envío de correos por la API de Brevo (producción: Render bloquea SMTP en el plan gratis) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Envío de correos por Gmail con contraseña de aplicación (local) |
| `CORREO_REMITENTE` | Remitente de los correos; con Brevo debe ser el remitente verificado |

Los correos salen por Brevo si hay `BREVO_API_KEY`; si no, por Gmail si hay `SMTP_USER`. Si no hay
ninguna de las dos, los correos (verificación, recuperación, código 2FA, avisos) **se imprimen en la
consola del backend** con sus enlaces: el sistema funciona igual en desarrollo.

Los valores reales del `.env` se comparten solo por privado y nunca se suben al repositorio.

### Cuentas de prueba (después de `npm run db:seed`)

| Rol | Correo | Contraseña |
|-----|--------|------------|
| Administrador | `admin@med-ia.bo` | `Admin123!` |
| Médicos | `ana.rojas@med-ia.bo`, `luis.mamani@med-ia.bo`, … | `Medico123!` |

Cambiá estas contraseñas si la base es accesible desde internet.

## Scripts

| Dónde | Comando | Qué hace |
|-------|---------|----------|
| backend | `npm run dev` | Servidor con recarga automática |
| backend | `npm run build` / `npm start` | Compila a `dist/` y lo ejecuta |
| backend | `npx tsc --noEmit` | Revisa los tipos sin compilar |
| backend | `npx ts-node src/scripts/probarCorreo.ts <correo>` | Envía un correo de prueba |
| backend | `npx ts-node src/scripts/probarIA.ts` | Prueba casos del análisis con la IA |
| frontend | `npm run dev` | Aplicación en modo desarrollo |
| frontend | `npm run build` / `npm start` | Compila y revisa tipos; sirve la versión compilada |

## Arquitectura del backend

Cada módulo vive en `src/modules/<nombre>/`: `*.routes.ts` (rutas y middlewares), `*.controller.ts`
(valida la entrada y responde) y `*.service.ts` (lógica y acceso a la base).

- Errores: los servicios lanzan `AppError` (`notFound`, `badRequest`, `conflict`…) y `globalErrorHandler`
  responde `{ success: false, message }`. `express-async-errors` lleva los errores async al handler, así
  que no hace falta try/catch en los controllers.
- Sesión: JWT con `token_version`; cerrar sesión, cambiar o restablecer la contraseña invalidan los tokens
  anteriores. `requireAuth` también rechaza cuentas desactivadas.
- Correos: `src/shared/correo.ts` (Brevo, Gmail o consola; nunca lanza error; registra cada envío en
  `NotificacionEmail`) y `src/shared/plantillaCorreo.ts`.
- Borrado lógico: no se borran filas. Las consultas eliminadas se ocultan (`oculta_paciente`) y las
  cuentas eliminadas se marcan con `eliminado_en` y se anonimizan (también en `IntentoLogin` y
  `NotificacionEmail`), así el registro de accesos y las estadísticas se conservan.
- Auditoría: las acciones del administrador sobre datos de pacientes, estados de cuentas y configuración
  quedan en `AuditoriaAcceso`; los intentos de login, en `IntentoLogin`.

### Endpoints principales

| Módulo | Rutas |
|--------|-------|
| `/auth` | `POST register, login, logout, recuperar, restablecer, verificar, reenviar-verificacion, 2fa` |
| `/consultas` | `POST /` · `GET /:id` · `POST /:id/rondas/:idRonda/respuestas` · `PATCH /:id/respuestas/:idPr` · `POST /:id/confirmar` · `POST /:id/reiniciar` · `PATCH /:id/cancelar` · `DELETE /:id` · `GET /historial` · `GET /restantes` |
| `/usuarios` | `GET/PATCH/DELETE /perfil` · `PATCH /perfil/doble-factor` |
| `/medicos` | `GET /especialidad/:id` · `GET /:id` · perfil, foto, disponibilidad y estadísticas del médico · CRUD del administrador |
| `/especialidades` | `GET /` · `POST`, `PATCH /:id`, `DELETE /:id` (administrador) |
| `/admin` | `dashboard`, `estadisticas`, `estadisticas/periodo`, `consultas`, `ranking-medicos`, `usuarios`, `configuracion`, `accesos` |
