# Criptografía — Isaac Montoya Rodríguez

Base reutilizable para un portafolio académico de prácticas de criptografía.
La interfaz está desarrollada con Astro, Tailwind CSS, React y TypeScript. Los
ejercicios se escriben en Python y se ejecutan directamente en el navegador con
Pyodide. Cada componente importa su archivo `.py` como texto con Vite, de modo
que el código mostrado en la página y el código ejecutado son la misma fuente.

Las primeras prácticas simulan un intercambio entre Alicia y Betito:

- **Práctica 01:** Alicia cifra un corazón BMP con una clave independiente para
  R, G y B y genera `img_c.bmp`; Betito resta la misma clave y obtiene
  `img_c_d.bmp`.
- **Práctica 02:** Alicia cifra una canción TXT mediante César y genera
  `song_c.txt`; Betito aplica el desplazamiento inverso y genera
  `song_c_d.txt`.

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

1. Crea el archivo Python en `web/src/python/`.
2. Crea el componente interactivo en `web/src/components/practices/`.
3. Crea la ruta en `web/src/pages/practicas/`.
4. Añade su ficha en `web/src/content/practices/`.
5. Agrega la entrada correspondiente al archivo vertical del inicio.

La carga de Pyodide y las operaciones comunes de archivos se reutilizan desde
`web/src/lib/`. Los controles compartidos se encuentran en
`web/src/components/ui/`, por lo que una práctica nueva solo implementa su
algoritmo, su interacción específica y su página.

La Práctica 00 incluida solo valida la ejecución de Python. Invertir texto no
se presenta como un método criptográfico.

Consulta `DEPLOY.md` para publicarlo desde tu propio GitHub.
