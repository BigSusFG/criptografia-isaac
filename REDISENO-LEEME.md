# Rediseño de la web personal de Isaac

La portada se rehízo en `web/src/pages/index.astro` y sus estilos se añadieron al final de `web/src/styles/global.css`. Navegación renovada en `web/src/components/Header.astro`.

## Navegación
- `/` = blog personal
- `/practicas/` = índice de las tres prácticas
- `/practicas/00/`, `/practicas/01/`, `/practicas/02/` = experiencias interactivas originales

## Importante antes de publicar
- **CV**: el `web/public/cv.pdf` del ZIP original contiene un nombre y correo diferentes de los facilitados para esta versión. Sustitúyelo por tu CV auténtico actualizado; no se modificó el PDF recibido.
- **Llave pública**: se conserva el archivo original `web/public/isaac_rsa_public.pub`. Confirma que efectivamente sea la llave que quieres publicar.
- **Instagram**: `@Bombanana` se enlaza a `instagram.com/bombanana/`, confirma que apunta a tu perfil.

## En tu computadora
1. Instala Node.js 20.19+ o 22+.
2. Abre terminal en `web`.
3. Ejecuta `npm ci`.
4. Ejecuta `npm run dev` para visualizar y `npm run build` para comprobar.

## Publicación a GitHub
La configuración existente en `.github/workflows/deploy.yml` publica GitHub Pages al subir cambios a `main`.
Con Git, desde la carpeta raíz:
```
git add .
git commit -m "Rediseñar sitio personal y separar prácticas"
git push origin main
```
Si prefieres subir desde GitHub web, sube el contenido del proyecto respetando las carpetas, incluida `.github/workflows` (no el ZIP como un solo archivo).

## Nota de verificación
No pudo ejecutarse el build en este entorno porque `node_modules` del ZIP contenía dependencias binarias no compatibles con el contenedor. El ZIP de entrega excluye node_modules para permitir una instalación limpia. Los archivos de práctica y su lógica original se conservaron.
