# 🍞 Guía de Uso de Toasts

Esta aplicación usa **react-hot-toast** para mostrar notificaciones al usuario.

## Configuración

El componente `Toaster` está configurado en [src/App.jsx](src/App.jsx) con posición `top-right` y estilos personalizados.

## Uso Básico

```jsx
import showToast from '../utils/toast'

// Éxito
showToast.cliente.created()
showToast.solicitud.updated()
showToast.saved()

// Error
showToast.error('Ocurrió un error')
showToast.serverError()

// Información
showToast.info('Documento procesándose...')

// Cargando
const toastId = showToast.loading('Procesando...')
// Luego puedes actualizar o cerrar el toast manualmente
```

## Ejemplos Implementados

### ✅ En FullFlow.jsx

1. **Crear cliente y solicitud**: Muestra toast al crear exitosamente
2. **Subir documentos**: Toast de carga → éxito/error
3. **Decisión de crédito**: Toast confirmando la decisión
4. **Cuentas bancarias**: Toast al crear/eliminar

```jsx
// Ejemplo: Crear cliente
try {
  const cliente = await createCliente(data)
  showToast.cliente.created() // ✓ Cliente creado exitosamente
} catch (err) {
  showToast.error(err.message)
}
```

## API Disponible

### Operaciones CRUD genéricas
- `showToast.created(entity)` - "✓ {entity} creado exitosamente"
- `showToast.updated(entity)` - "✓ {entity} actualizado exitosamente"
- `showToast.deleted(entity)` - "✓ {entity} eliminado exitosamente"
- `showToast.saved()` - "✓ Cambios guardados"

### Errores
- `showToast.error(message)` - Error personalizado
- `showToast.serverError()` - Error genérico del servidor
- `showToast.validationError(message)` - Error de validación

### Casos específicos
- `showToast.cliente.created()` / `.updated()` / `.deleted()`
- `showToast.solicitud.created()` / `.updated()` / `.deleted()` / `.submitted()`
- `showToast.banco.created()` / `.updated()` / `.deleted()`
- `showToast.documento.uploaded()` / `.uploadError()` / `.processing()`
- `showToast.copied()` - "✓ Copiado al portapapeles"
- `showToast.downloaded()` - "✓ Descarga completada"

### Para operaciones asíncronas
```jsx
const promise = fetch('/api/data')
showToast.promise(promise, {
  loading: 'Guardando...',
  success: '✓ Guardado exitosamente',
  error: '✗ Error al guardar'
})
```

## Personalización

Para toasts personalizados, importa directamente `toast`:

```jsx
import { toast } from '../utils/toast'

toast.success('Mensaje personalizado', {
  duration: 5000,
  style: {
    background: '#10b981',
    color: '#fff',
  }
})
```

## Colores

Los toasts usan colores consistentes con el diseño:
- **Éxito**: Verde (`#10b981`)
- **Error**: Rojo (`#ef4444`)
- **Info/Cargando**: Azul (`#3b82f6`)

---

**Documentación completa**: [react-hot-toast](https://react-hot-toast.com/)
