#!/bin/bash

# Este script filtra los logs de la carga de archivos para solo mostrar debugs relevantes
# Uso: chmod +x watch-debug.sh && npm run dev 2>&1 | ./watch-debug.sh

if [ "$1" = "errors" ]; then
  # Solo errores
  grep -E "\[Upload\]|\[Textract\]|\[EmpresaService\]" | grep "✗|ERROR|failed|Failed"
elif [ "$1" = "success" ]; then
  # Solo éxitos
  grep -E "\[Upload\]|\[Textract\]|\[EmpresaService\]" | grep "✓"
elif [ "$1" = "flow" ]; then
  # Flujo principal (sin detalles)
  grep -E "▶|✓.*completado|✓.*COMPLETADO|✗"
else
  # Todo (defecto)
  grep -E "\[Upload\]|\[Textract\]|\[EmpresaService\]"
fi
