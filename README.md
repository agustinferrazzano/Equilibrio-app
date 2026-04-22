# Equilibrio-app

Monorepo para desarrollar la aplicación Equilibrio con tres paquetes:

- `apps/frontend`: interfaz web en Next.js
- `apps/backend`: servicio backend en TypeScript
- `packages/core`: modelos y contratos compartidos

## Requisitos

- Node.js 20 o superior
- npm 10 o superior

## Instalación

Desde la raíz del proyecto:

```bash
npm install
```

## Desarrollo

Levantar el frontend:

```bash
npm run dev -w frontend
```

Levantar el backend:

```bash
npm run dev -w backend
```

Ese comando recompila primero `packages/core`, así el backend no depende de un `dist` generado a mano.

Para desarrollo continuo de backend + librería compartida, abre una tercera terminal y deja el core en watch:

```bash
npm run dev -w @equilibrio/core
```

Con eso, cada cambio en `packages/core/src` vuelve a generar `dist` automáticamente.

Si prefieres trabajar dentro de cada carpeta, también puedes ejecutar los mismos scripts desde `apps/frontend` y `apps/backend`.

## Verificación

Comandos disponibles desde la raíz:

```bash
npm run build
npm run lint
npm test
```

`npm run build` compila los paquetes que exponen script de build; en el backend, el core compartido se prepara antes de compilar. `npm run lint` ejecuta el lint en los workspaces que lo tienen definido y `npm test` solo correrá suites en los paquetes que agreguen un script `test`.

## Flujo recomendado

1. Instalar dependencias con `npm install`.
2. Abrir dos terminales y ejecutar `npm run dev -w frontend` y `npm run dev -w backend`.
3. Si vas a tocar código compartido, abrir otra terminal con `npm run dev -w @equilibrio/core`.
4. Antes de compartir cambios, correr `npm run lint` y `npm run build`.
5. Cuando agregues tests, ejecutar `npm test` para validar todos los workspaces.

## Estado actual

- El frontend arranca con la página base de Next.js y está listo para reemplazar la pantalla inicial.
- El backend hoy solo inicializa un asset de ejemplo y sirve como punto de arranque para la lógica compartida.
- El paquete `@equilibrio/core` concentra los modelos y repositorios reutilizables entre frontend y backend.