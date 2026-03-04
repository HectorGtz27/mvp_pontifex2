# Guía de Debugs - Constancia de Situación Fiscal

## 📌 Resumen de Cambios

Se han agregado **debugs estratégicos** en 3 archivos para rastrear el flujo completo:

### 1. **uploadController.cjs** (líneas 12-146)
**Responsabilidad:** Maneja la carga del archivo y orquesta el procesamiento
- ✅ Validación del archivo (MIME type, tamaño)
- ✅ Upload a S3
- ✅ Comprobación del `documentTypeId` (debe ser `situacion_fiscal`)
- ✅ Llamada a Textract
- ✅ Guardado en BD

### 2. **textractService.cjs** (múltiples secciones)
**Responsabilidad:** Extrae datos usando AWS Textract

#### a) **analyzeDocumentForms()** (líneas 62-98)
- Decide si usar API síncrona (imágenes) o asíncrona (PDFs)

#### b) **analyzeDocumentFormsAsync()** (líneas 109-210)
- Inicio del job de Textract
- Polling each 2 segundos
- Acumulación de bloques
- Control de timeouts

#### c) **parseFormsResponse()** (líneas 221-352)
- Parsea bloques de Textract
- Mapea campos a estructura interna
- Reporta claves sin mapear

### 3. **empresaService.cjs** (líneas 13-50)
**Responsabilidad:** Guarda datos en la base de datos
- Preparación de datos
- Inserción en tabla `empresas`
- Confirmación con ID generado

---

## 🔍 Cómo Ver los Logs

### **En desarrollo local (terminal)**
```bash
# Terminal 1: Inicia el servidor (ya debe estar corriendo)
npm run dev

# Terminal 2: Sube un archivo
# Los logs aparecerán en Terminal 1
```

### **Ejemplo de salida esperada**

```
═══════════════════════════════════════════════════════════
[Upload] ▶ INICIANDO CARGA DE ARCHIVO
═══════════════════════════════════════════════════════════
[Upload] Archivo recibido: constancia.pdf (245.32 KB, MIME: application/pdf)
[Upload] ✓ Validaciones aceptadas
[Upload] ▶ Subiendo a S3 con clave: uploads/a3f2c9e1-4b21-4f89-9d7a-8e6c3a1b2f4d.pdf
[Upload] ✓ S3 OK: https://bucket.s3.us-east-1.amazonaws.com/uploads/a3f2c9e1...
[Upload] 📋 documentTypeId recibido: "situacion_fiscal"
[Upload] ▶ Documento tipo "situacion_fiscal" detectado. Iniciando Textract...
[Upload] ▶ Llamando a analyzeDocumentForms()...

[Textract/FORMS] ▶ INICIANDO analyzeDocumentForms()
[Textract/FORMS] Buffer: 251543 bytes, MIME: application/pdf, S3Key: uploads/...
[Textract/FORMS] 📄 Detectado PDF - Usando API asíncrona con polling

[Textract/FORMS-Async] ▶ INICIANDO procesamiento asíncrono
[Textract/FORMS-Async] S3Bucket: pontifex-uploads, S3Key: uploads/...
[Textract/FORMS-Async] ▶ Iniciando job de análisis asíncrono en AWS...
[Textract/FORMS-Async] ✓ Job iniciado
[Textract/FORMS-Async] JobId: 1234567890abcdef1234567890abcdef
[Textract/FORMS-Async] ▶ Poll intento 1/30...
[Textract/FORMS-Async]   Página 1: Status=IN_PROGRESS
[Textract/FORMS-Async] Poll 1: IN_PROGRESS (0 bloques acumulados)
[Textract/FORMS-Async] ▶ Poll intento 2/30...
[Textract/FORMS-Async]   Página 1: Status=SUCCEEDED
[Textract/FORMS-Async]   Página 1: 247 bloques
[Textract/FORMS-Async]   ✓ Fin de paginas (NextToken = undefined)
[Textract/FORMS-Async] Poll 2: SUCCEEDED (247 bloques acumulados)
[Textract/FORMS-Async] ✓ Job COMPLETADO - 247 bloques totales

[Textract/Parse] ▶ INICIANDO parseFormsResponse()
[Textract/Parse] Bloques totales a procesar: 247
[Textract/Parse]   ✓ Mapeado: "rfc" → "rfc" = "AAA010203AB9"
[Textract/Parse]   ✓ Mapeado: "curp" → "curp" = "AAAA010203HDFRRL01"
[Textract/Parse]   ✓ Mapeado: "denominacion/razon social" → "razon_social" = "EMPRESA XYZ S.A."
[Textract/Parse]   ✓ Mapeado: "nombre de vialidad" → "vialidad" = "AVENIDA REFORMA"
[Textract/Parse]   ✓ Mapeado: "numero exterior" → "numero_exterior" = "505"
[Textract/Parse] ✓ Procesados 15 pares KEY_VALUE_SET
[Textract/Parse] ✓ 8 campos mapeados, 7 sin mapear
[Textract/Parse] Pares mapeados: {...}
[Textract/Parse] Domicilio fiscal construido: "AVENIDA REFORMA #505"

[Textract/Parse] ✓ Objeto final construido: {...}
[Upload] ✓ Textract completado exitosamente

[EmpresaService] ▶ INICIANDO createEmpresa()
[EmpresaService] Datos recibidos: {...}
[EmpresaService] numero_empleados: "null" → NaN (NaN)
[EmpresaService] Objeto a insertar en BD: {...}
[EmpresaService] ✓ Registro creado en BD
[EmpresaService] ID: 550e8400-e29b-41d4-a716-446655440000
[EmpresaService] Razón Social: EMPRESA XYZ S.A.
[EmpresaService] RFC: AAA010203AB9

[Upload] ✓ Empresa guardada en BD exitosamente
[Upload] ✓ PROCESO COMPLETADO EXITOSAMENTE
═══════════════════════════════════════════════════════════
```

---

## 🐛 Cómo Diagnosticar Problemas

### **SCENARIO 1: Archivo no sube a S3**
Busca en los logs:
```
[Upload] ▶ Subiendo a S3 con clave: ...
[Upload] ✗ ...
```

**Causas posibles:**
- AWS credentials inválidas
- S3 bucket no existe
- Permisos insuficientes

---

### **SCENARIO 2: documentTypeId no llega correctamente**
Busca:
```
[Upload] 📋 documentTypeId recibido: "null"
```

**Causas posibles:**
- Frontend no está enviando `documentTypeId` en FormData
- El valor no es exactamente `"situacion_fiscal"` (verificar mayúsculas)

**Solución:** Revisar en `DocumentUpload.jsx` línea ~27:
```javascript
const formData = new FormData()
formData.append('file', file)
formData.append('documentTypeId', 'situacion_fiscal')  // ← Debe ser exacto
```

---

### **SCENARIO 3: Textract no retorna bloques**
Busca:
```
[Textract/FORMS-Async] Poll 3: IN_PROGRESS (0 bloques acumulados)
[Textract/FORMS-Async] ✗ Job no completó después de 30 intentos
```

**Causas posibles:**
- El PDF es muy complejo o muy grande
- AWS Textract tiene errores procesando el archivo
- Timeout muy corto (MAX_ATTEMPTS = 30 polls × 2 segundos = 60 segundos máximo)

**Soluciones:**
1. Aumentar `MAX_ATTEMPTS` en línea 112 de `textractService.cjs`
2. Verificar que el PDF es válido (no corrupto)
3. Probar con un PDF de prueba más simple

---

### **SCENARIO 4: Bloques recibidos pero 0 campos mapeados**
Busca:
```
[Textract/Parse]   ⚠ No mapeado: "rfc numero de identificacion" = "AAA010203AB9"
[Textract/Parse] ✓ Procesados 15 pares KEY_VALUE_SET
[Textract/Parse] ✓ 0 campos mapeados, 15 sin mapear
```

**Causas posibles:**
- Las etiquetas en el PDF son diferentes a las esperadas
- Textract no está detectando los campos como esperado

**Solución:** Agregar nuevas claves a `CSF_KEY_MAP` en `textractService.cjs` línea 14:
```javascript
const CSF_KEY_MAP = {
  // ... existentes ...
  'rfc numero de identificacion': 'rfc',  // ← Nueva entrada
}
```

---

### **SCENARIO 5: Datos extraídos pero no guardan en BD**
Busca:
```
[Upload] ✓ Textract completado exitosamente
[Upload] ▶ Guardando datos en BD...
[Upload] ✗ ERROR AL GUARDAR EN BD: ...
```

**Causas posibles:**
- Conexión a BD fallida
- Campos requeridos en BD no rellenados
- Constraint unique violated (ej: RFC duplicado)

**Solución:** Revisar error detallado:
```
[Upload] ✗ ERROR AL GUARDAR EN BD:
         Unique constraint failed on the fields: (`rfc`)
```

---

## 📊 Flujo Completo

```
┌─────────────────────────────────┐
│ Frontend (DocumentUpload.jsx)    │
│ Sube archivo + documentTypeId    │
└────────────┬────────────────────┘
             │ POST /api/upload
             ▼
┌─────────────────────────────────────────┐
│ uploadController.cjs (uploadFile)       │
│ ✅ Valida archivo                       │
│ ✅ Sube a S3                            │
│ ✅ Verifica documentTypeId              │
└────────────┬────────────────────────────┘
             │ documentTypeId === 'situacion_fiscal'?
             ▼
┌─────────────────────────────────────────┐
│ textractService.cjs (analyzeDocumentForms) │
│ ✅ Detecta PDF vs Imagen                │
│ ✅ Llama API adecuada                   │
└────────────┬────────────────────────────┘
             │
      PDF? ──┴─→ IMAGEN?
      │          │
      ▼          ▼
   Async      Sync API
   Polling
             │
             ├─────────────────┬──────────────┤
             │                 │              │
    ┌─────────────┴──────────────────────────────┐
    │ parseFormsResponse()                        │
    │ ✅ Parse KEY_VALUE_SET blocks              │
    │ ✅ Mapea a CSF_KEY_MAP                    │
    │ ✅ Construye objeto empresa              │
    └────────────┬─────────────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────┐
    │ empresaService.cjs            │
    │ (createEmpresa)              │
    │ ✅ Inserta en tabla empresas │
    │ ✅ Retorna ID                │
    └────────────┬─────────────────┘
                 │
                 ▼
    ┌──────────────────────────────┐
    │ Response JSON a Frontend     │
    │ ✅ success: true             │
    │ ✅ empresa.id                │
    │ ✅ extractedData             │
    └──────────────────────────────┘
```

---

## 🔧 Configuración de Logs

### **Aumentar verbosidad**
Los logs usan `console.log()` y `console.error()`. Para filtrar solo errores:
```bash
npm run dev 2>&1 | grep "ERROR\|✗"
```

### **Guardar logs a archivo**
```bash
npm run dev > server.log 2>&1 &
tail -f server.log
```

### **Filtrar por etapa**
```bash
npm run dev 2>&1 | grep "Upload\|Textract\|EmpresaService"
```

---

## 📝 Notas Importantes

1. **Textract es ASÍNCRONO para PDFs**: Usa polling cada 2 segundos. Esto significa que el primer poll verá `IN_PROGRESS`. Esto es **NORMAL**.

2. **Timeout de 60 segundos**: Si el PDF tarda más de 60 segundos, aumenta `MAX_ATTEMPTS` en `textractService.cjs:112`.

3. **Campos por defecto**: Si Textract no extrae un campo:
   - `razon_social` → "Sin razón social"
   - `rfc` → "SIN_RFC"
   - Otros campos → `null`

4. **_extra fields**: Los campos que no se mapean a la tabla `empresas` se guardan en `_extra` en la respuesta JSON pero no se almacenan en BD.

---

## ✅ Checklist para Debugging

- [ ] El servidor está corriendo en puerto 3001
- [ ] AWS credentials están configuradas correctamente
- [ ] S3 bucket existe y es accesible
- [ ] DocumentTypeId en Frontend es exactamente `"situacion_fiscal"`
- [ ] El PDF/imagen es válido y no corrupto
- [ ] Base de datos está corriendo y es accesible
- [ ] Ver los logs completos con grep para encontrar errores

---

## 📞 Ayuda Rápida

**¿Dónde agregué los debugs?**
1. `/Users/user/mvp_pontifex2/server/controllers/uploadController.cjs`
2. `/Users/user/mvp_pontifex2/server/services/textractService.cjs`
3. `/Users/user/mvp_pontifex2/server/services/empresaService.cjs`

**¿Cómo deshabilito los debugs?**
Reemplazar `console.log()` con `// console.log()` o comentar las líneas.

**¿Qué pasa si veo claves sin mapear?**
Agrega nuevas entradas a `CSF_KEY_MAP` en `textractService.cjs:14`.
