# Criptografía — Isaac Montoya Rodríguez

Base reutilizable para un portafolio académico de prácticas de criptografía.
La interfaz está desarrollada con Astro, Tailwind CSS, React y TypeScript. Los
ejercicios se escriben en Python y se ejecutan directamente en el navegador con
Pyodide.

## Ejecutar localmente

```bash
cd web
npm install
npm run dev
```

## Construir el sitio

```bash
cd web
npm run build
```

El resultado estático se genera en `web/dist` y no necesita un servidor Python.

## Agregar una práctica

1. Crea el archivo Python en `python/`.
2. Crea el componente interactivo en `web/src/components/practices/`.
3. Crea la ruta en `web/src/pages/practicas/`.
4. Añade su ficha en `web/src/content/practices/`.
5. Agrega la entrada correspondiente al archivo vertical del inicio.

La Práctica 00 incluida solo valida la ejecución de Python. Invertir texto no
se presenta como un método criptográfico.

Consulta `DEPLOY.md` para publicarlo desde tu propio GitHub.
