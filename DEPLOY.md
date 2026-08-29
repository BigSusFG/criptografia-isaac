# Publicación desde GitHub

## GitHub Pages

1. Crea un repositorio nuevo en tu cuenta de GitHub.
2. Sube todo el contenido de esta carpeta a la rama `main`.
3. En el repositorio abre `Settings` → `Pages`.
4. En `Source`, selecciona `GitHub Actions`.
5. El flujo incluido en `.github/workflows/deploy.yml` construirá y publicará
   automáticamente el sitio después de cada `push` a `main`.

La configuración detecta el nombre del repositorio y ajusta la ruta base para
una URL de proyecto como `https://usuario.github.io/repositorio/`.

## Cloudflare Pages

También puedes conectar el mismo repositorio a Cloudflare Pages:

- Directorio raíz: `web`
- Comando de construcción: `npm run build`
- Directorio de salida: `dist`

Pyodide se ejecuta en el navegador, por lo que ninguna de las dos opciones
requiere un backend de Python.
