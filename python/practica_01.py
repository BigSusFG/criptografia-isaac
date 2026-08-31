import base64
import json
import struct


def convertir_hex(color: str) -> tuple[int, int, int]:
    color = color.lstrip("#")
    return tuple(int(color[indice : indice + 2], 16) for indice in (0, 2, 4))


def filas_circulo_relleno(
    ancho: int, alto: int, radio: int
) -> dict[int, tuple[int, int]]:
    """Calcula tramos horizontales para rellenar un círculo por punto medio."""
    centro_x = ancho // 2
    centro_y = alto // 2
    x = 0
    y = radio
    decision = 1 - radio
    filas: dict[int, tuple[int, int]] = {}

    def registrar_fila(fila: int, izquierda: int, derecha: int) -> None:
        if not 0 <= fila < alto:
            return
        izquierda = max(0, izquierda)
        derecha = min(ancho - 1, derecha)
        if izquierda > derecha:
            return
        anterior = filas.get(fila)
        if anterior:
            filas[fila] = (min(anterior[0], izquierda), max(anterior[1], derecha))
        else:
            filas[fila] = (izquierda, derecha)

    while x <= y:
        registrar_fila(centro_y + y, centro_x - x, centro_x + x)
        registrar_fila(centro_y - y, centro_x - x, centro_x + x)
        registrar_fila(centro_y + x, centro_x - y, centro_x + y)
        registrar_fila(centro_y - x, centro_x - y, centro_x + y)

        x += 1
        if decision < 0:
            decision += 2 * x + 1
        else:
            y -= 1
            decision += 2 * (x - y) + 1

    return filas


def desplazar_color(color: tuple[int, int, int], desplazamiento: int) -> tuple[int, int, int]:
    return tuple((canal + desplazamiento) % 256 for canal in color)


def construir_bmp(
    ancho: int,
    alto: int,
    fondo: tuple[int, int, int],
    circulo: tuple[int, int, int],
    filas: dict[int, tuple[int, int]],
    desplazamiento: int = 0,
) -> bytes:
    bytes_por_fila = ancho * 3
    relleno = (4 - bytes_por_fila % 4) % 4
    tamano_pixeles = (bytes_por_fila + relleno) * alto
    tamano_archivo = 54 + tamano_pixeles
    cabecera = struct.pack("<2sIHHI", b"BM", tamano_archivo, 0, 0, 54)
    informacion = struct.pack(
        "<IIIHHIIIIII", 40, ancho, alto, 1, 24, 0, tamano_pixeles, 2835, 2835, 0, 0
    )
    pixeles = bytearray()

    for y in range(alto - 1, -1, -1):
        tramo = filas.get(y)
        for x in range(ancho):
            dentro = tramo is not None and tramo[0] <= x <= tramo[1]
            color = circulo if dentro else fondo
            rojo, verde, azul = desplazar_color(color, desplazamiento)
            pixeles.extend((azul, verde, rojo))
        pixeles.extend(b"\x00" * relleno)

    return cabecera + informacion + pixeles


def generar_paquete(
    ancho: int,
    alto: int,
    radio: int,
    color_fondo: str,
    color_circulo: str,
    desplazamiento: int,
) -> str:
    fondo = convertir_hex(color_fondo)
    circulo = convertir_hex(color_circulo)
    filas = filas_circulo_relleno(ancho, alto, radio)
    original = construir_bmp(ancho, alto, fondo, circulo, filas)
    resultado = construir_bmp(ancho, alto, fondo, circulo, filas, desplazamiento)
    pixeles_rellenos = sum(derecha - izquierda + 1 for izquierda, derecha in filas.values())

    return json.dumps(
        {
            "original": base64.b64encode(original).decode("ascii"),
            "resultado": base64.b64encode(resultado).decode("ascii"),
            "fondo_resultado": "#%02x%02x%02x" % desplazar_color(fondo, desplazamiento),
            "circulo_resultado": "#%02x%02x%02x" % desplazar_color(circulo, desplazamiento),
            "pixeles_circulo": pixeles_rellenos,
        }
    )


def desplazar_pixeles_rgba(pixeles_base64: str, desplazamiento: int) -> str:
    """Desplaza RGB de una imagen decodificada y conserva su canal alfa."""
    pixeles = bytearray(base64.b64decode(pixeles_base64))
    for indice in range(0, len(pixeles), 4):
        pixeles[indice] = (pixeles[indice] + desplazamiento) % 256
        pixeles[indice + 1] = (pixeles[indice + 1] + desplazamiento) % 256
        pixeles[indice + 2] = (pixeles[indice + 2] + desplazamiento) % 256
    return base64.b64encode(pixeles).decode("ascii")
