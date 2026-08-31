import json


def desplazar_caracter(caracter: str, desplazamiento: int) -> str:
    """Desplaza letras ASCII y conserva cualquier otro carácter."""
    if "A" <= caracter <= "Z":
        return chr((ord(caracter) - ord("A") + desplazamiento) % 26 + ord("A"))
    if "a" <= caracter <= "z":
        return chr((ord(caracter) - ord("a") + desplazamiento) % 26 + ord("a"))
    return caracter


def cifrar_cesar(texto: str, desplazamiento: int) -> str:
    return "".join(desplazar_caracter(caracter, desplazamiento) for caracter in texto)


def generar_resultado(texto: str, desplazamiento: int) -> str:
    salida = cifrar_cesar(texto, desplazamiento)
    letras = sum(caracter.isascii() and caracter.isalpha() for caracter in texto)
    return json.dumps(
        {
            "salida": salida,
            "desplazamiento_efectivo": desplazamiento % 26,
            "letras_transformadas": letras,
            "caracteres_totales": len(texto),
        },
        ensure_ascii=False,
    )
