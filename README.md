# Med-IA — Base del Proyecto

Sistema de triage médico con IA · Taller de Sistemas de Información

## Estructura

```
med-ia/
├── backend/    Node.js · Express · TypeScript · Prisma · PostgreSQL
└── frontend/   Next.js 14 · React · TypeScript · Tailwind CSS
```

## Arrancar el proyecto

### Backend
```bash
cd backend
cp .env.example .env        # Completar variables
npm install
npx prisma migrate dev      # Crea las tablas
npm run db:seed             # Datos iniciales (especialidades + admin)
npm run dev                 # http://localhost:3001
```
Credenciales admin: `admin@med-ia.bo` / `Admin123!`

### Frontend
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

## Arquitectura del backend

Cada módulo de negocio vive en `src/modules/<nombre>/` con tres archivos:
- `routes.ts`     — define las rutas y qué middleware aplica
- `controller.ts` — recibe la petición, delega al servicio, responde
- `service.ts`    — contiene la lógica de negocio y accede a la BD

Los errores se manejan con `AppError` (src/errors/) y un handler global.
