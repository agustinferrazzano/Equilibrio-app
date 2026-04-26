# Equilibrio-app

Monorepo para gestionar transacciones de inversiones con frontend en Next.js, backend en Express y logica compartida en TypeScript.

## Estructura

- apps/frontend: interfaz web (Next.js 16, React 19, Tailwind 4, Recharts)
- apps/backend: API REST (Express + TypeScript + SQLite)
- packages/core: modelos, contratos de repositorios y casos de uso compartidos

## Requisitos

- Node.js 20 o superior
- npm 10 o superior

## Instalacion

Desde la raiz:

```bash
npm install
```

## Scripts del monorepo

Desde la raiz:

```bash
npm run build
npm run lint
npm test
```

- build: ejecuta build en todos los workspaces con script definido
- lint: ejecuta lint en workspaces que tengan script lint
- test: ejecuta tests en workspaces que tengan script test (actualmente core)

## Desarrollo local

Abrir dos terminales:

```bash
npm run dev -w backend
npm run dev -w frontend
```

Notas:

- El backend corre en http://localhost:3001
- El frontend corre en http://localhost:3000
- El script dev del backend recompila primero @equilibrio/core para evitar desfasajes de tipos/artefactos

Si vas a trabajar mucho en codigo compartido, puedes dejar core en watch en una tercera terminal:

```bash
npm run dev -w @equilibrio/core
```

## Persistencia y migraciones

- Base de datos: SQLite (better-sqlite3)
- Archivo local: apps/backend/data/equilibrio.db
- Migraciones automaticas al iniciar backend
- Tabla schema_migrations para control de versiones

## API disponible

Base URL: http://localhost:3001

Rutas:

- GET /
- GET /health
- GET /api/transactions
- GET /api/transactions/:id
- POST /api/transactions
- PUT /api/transactions/:id
- DELETE /api/transactions/:id
- GET /api/portfolio/:userId

### Query params en listado de transacciones

GET /api/transactions acepta:

- userId
- assetId
- page (default: 1)
- pageSize (default: 10)
- sortBy: date | price | quantity
- sortOrder: asc | desc

Respuesta paginada esperada:

```json
{
	"data": [],
	"total": 0,
	"page": 1,
	"pageSize": 10
}
```

## Resumen de portfolio

GET /api/portfolio/:userId devuelve posiciones activas por activo con:

- assetId
- totalQuantity
- averagePrice
- totalInvested

El calculo usa un promedio ponderado de costo sobre transacciones BUY/SELL y excluye activos con cantidad final 0.

## Frontend actual

La pantalla principal incluye:

- Formulario de alta/edicion de transacciones
- Listado con filtros, orden y paginacion
- Eliminacion con modal de confirmacion
- Toasts de exito/error
- Dashboard de portfolio con grafico de torta (Recharts)

El dashboard consulta el endpoint de portfolio con un usuario demo fijo (user-page).

## Tests

- packages/core tiene configurado Jest + ts-jest
- Ejecutar todos los tests desde raiz:

```bash
npm test
```

## Build de produccion

```bash
npm run build
```

Para ejecutar backend compilado:

```bash
npm run start -w backend
```