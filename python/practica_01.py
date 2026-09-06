import base64
import json
import struct


ClaveRGB = tuple[int, int, int]
ColorRGB = tuple[int, int, int]


def convertir_hex(color: str) -> ColorRGB:
    """Convierte un color hexadecimal #RRGGBB a una tupla RGB."""
    color = color.lstrip("#")
    return tuple(int(color[indice : indice + 2], 16) for indice in (0, 2, 4))


def desplazar_color(color: ColorRGB, clave: ClaveRGB, direccion: int = 1) -> ColorRGB:
    """Suma o resta de forma modular una clave distinta a R, G y B."""
    return tuple(
        (canal + direccion * desplazamiento) % 256
        for canal, desplazamiento in zip(color, clave)
    )


def crear_mascara_corazon(ancho: int, alto: int, escala: int) -> tuple[list[bytearray], int]:
    """Crea un corazón relleno con su ecuación implícita."""
    centro_x = (ancho - 1) / 2
    centro_y = (alto - 1) / 2
    mascara: list[bytearray] = []
    pixeles_rellenos = 0

    for y in range(alto):
        fila = bytearray(ancho)
        normal_y = (centro_y - y) / escala
        for x in range(ancho):
            normal_x = (x - centro_x) / escala
            base = normal_x * normal_x + normal_y * normal_y - 1
            dentro = base**3 - normal_x * normal_x * normal_y**3 <= 0
            if dentro:
                fila[x] = 1
                pixeles_rellenos += 1
        mascara.append(fila)

    return mascara, pixeles_rellenos


def construir_bmp(
    ancho: int,
    alto: int,
    fondo: ColorRGB,
    corazon: ColorRGB,
    mascara: list[bytearray],
    clave: ClaveRGB = (0, 0, 0),
    direccion: int = 1,
) -> bytes:
    """Construye manualmente un BMP de 24 bits, de abajo hacia arriba y en BGR."""
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
        for x in range(ancho):
            color = corazon if mascara[y][x] else fondo
            rojo, verde, azul = desplazar_color(color, clave, direccion)
            pixeles.extend((azul, verde, rojo))
        pixeles.extend(b"\x00" * relleno)

    return cabecera + informacion + pixeles


def generar_paquete_cifrado(
    ancho: int,
    alto: int,
    escala: int,
    color_fondo: str,
    color_corazon: str,
    desplazamiento_r: int,
    desplazamiento_g: int,
    desplazamiento_b: int,
) -> str:
    """Genera el corazón original y img_c.bmp con la clave RGB de Alicia."""
    fondo = convertir_hex(color_fondo)
    corazon = convertir_hex(color_corazon)
    clave = (desplazamiento_r, desplazamiento_g, desplazamiento_b)
    mascara, pixeles_rellenos = crear_mascara_corazon(ancho, alto, escala)
    original = construir_bmp(ancho, alto, fondo, corazon, mascara)
    cifrada = construir_bmp(ancho, alto, fondo, corazon, mascara, clave)

    return json.dumps(
        {
            "original": base64.b64encode(original).decode("ascii"),
            "cifrada": base64.b64encode(cifrada).decode("ascii"),
            "fondo_cifrado": "#%02x%02x%02x" % desplazar_color(fondo, clave),
            "corazon_cifrado": "#%02x%02x%02x" % desplazar_color(corazon, clave),
            "pixeles_corazon": pixeles_rellenos,
        }
    )


def descifrar_pixeles_rgba_a_bmp(
    pixeles_base64: str,
    ancho: int,
    alto: int,
    desplazamiento_r: int,
    desplazamiento_g: int,
    desplazamiento_b: int,
) -> str:
    """Resta la clave RGB a píxeles RGBA y devuelve img_c_d.bmp en base64."""
    pixeles_rgba = bytearray(base64.b64decode(pixeles_base64))
    clave = (desplazamiento_r, desplazamiento_g, desplazamiento_b)
    bytes_por_fila = ancho * 3
    relleno = (4 - bytes_por_fila % 4) % 4
    tamano_pixeles = (bytes_por_fila + relleno) * alto
    cabecera = struct.pack("<2sIHHI", b"BM", 54 + tamano_pixeles, 0, 0, 54)
    informacion = struct.pack(
        "<IIIHHIIIIII", 40, ancho, alto, 1, 24, 0, tamano_pixeles, 2835, 2835, 0, 0
    )
    datos_bmp = bytearray()

    for y in range(alto - 1, -1, -1):
        for x in range(ancho):
            indice = (y * ancho + x) * 4
            color_cifrado = tuple(pixeles_rgba[indice : indice + 3])
            rojo, verde, azul = desplazar_color(color_cifrado, clave, direccion=-1)
            datos_bmp.extend((azul, verde, rojo))
        datos_bmp.extend(b"\x00" * relleno)

    return base64.b64encode(cabecera + informacion + datos_bmp).decode("ascii")
