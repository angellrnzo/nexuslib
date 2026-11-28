#!/usr/bin/env python3
# Buscador rápido de index.html — uso: python search.py <patron>
# Ejemplos:
#   python search.py stats-prof-btn
#   python search.py carousel-arrow
#   python search.py nexusPersonaDisplay

import sys
import re

def buscar(patron):
    with open('index.html', 'r', encoding='utf-8') as f:
        lineas = f.readlines()

    patron_lower = patron.lower()
    resultados = []

    for i, linea in enumerate(lineas, 1):
        linea_lower = linea.lower()
        if patron_lower in linea_lower:
            resultados.append((i, linea.rstrip()))

    if not resultados:
        print(f"No se encontró '{patron}' en index.html")
        return

    print(f"Coincidencias para '{patron}' ({len(resultados)}):\n")
    for i, linea in resultados:
        print(f"Línea {i}: {linea}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Uso: python search.py <patron>")
        print("Ejemplo: python search.py stats-prof-btn")
        sys.exit(1)
    buscar(sys.argv[1])
