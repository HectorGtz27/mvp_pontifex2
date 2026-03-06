import toast from 'react-hot-toast'

/**
 * Utilidades para mostrar notificaciones toast en la aplicación
 */

// Toast personalizado con estilo Pontifex
const pontifexToast = {
  success: (message) => {
    return toast.success(message, {
      style: {
        background: '#10b981',
        color: '#fff',
        fontWeight: '500',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#10b981',
      },
    })
  },
  
  error: (message) => {
    return toast.error(message, {
      style: {
        background: '#ef4444',
        color: '#fff',
        fontWeight: '500',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#ef4444',
      },
    })
  },
  
  loading: (message) => {
    return toast.loading(message, {
      style: {
        background: '#3b82f6',
        color: '#fff',
        fontWeight: '500',
      },
    })
  },
  
  info: (message) => {
    return toast(message, {
      icon: 'ℹ️',
      style: {
        background: '#3b82f6',
        color: '#fff',
        fontWeight: '500',
      },
    })
  },
  
  promise: (promise, messages) => {
    return toast.promise(promise, messages, {
      success: {
        style: {
          background: '#10b981',
          color: '#fff',
          fontWeight: '500',
        },
      },
      error: {
        style: {
          background: '#ef4444',
          color: '#fff',
          fontWeight: '500',
        },
      },
      loading: {
        style: {
          background: '#3b82f6',
          color: '#fff',
          fontWeight: '500',
        },
      },
    })
  },
}

// Mensajes predefinidos para operaciones comunes
export const showToast = {
  // Operaciones CRUD genéricas
  created: (entity = 'Registro') => 
    pontifexToast.success(`✓ ${entity} creado exitosamente`),
  
  updated: (entity = 'Registro') => 
    pontifexToast.success(`✓ ${entity} actualizado exitosamente`),
  
  deleted: (entity = 'Registro') => 
    pontifexToast.success(`✓ ${entity} eliminado exitosamente`),
  
  saved: () => 
    pontifexToast.success('✓ Cambios guardados'),
  
  // Errores comunes
  error: (message = 'Ocurrió un error inesperado') => 
    pontifexToast.error(`✗ ${message}`),
  
  serverError: () => 
    pontifexToast.error('✗ Error en el servidor. Intenta de nuevo'),
  
  validationError: (message = 'Por favor verifica los datos ingresados') => 
    pontifexToast.error(`✗ ${message}`),
  
  // Estados de carga
  loading: (message = 'Cargando...') => 
    pontifexToast.loading(message),
  
  // Información
  info: (message) => 
    pontifexToast.info(message),
  
  // Para operaciones asíncronas
  promise: (promise, options = {}) => {
    const messages = {
      loading: options.loading || 'Procesando...',
      success: options.success || '✓ Operación completada',
      error: options.error || '✗ Ocurrió un error',
    }
    return pontifexToast.promise(promise, messages)
  },
  
  // Casos específicos de la app
  cliente: {
    created: () => pontifexToast.success('✓ Cliente creado exitosamente'),
    updated: () => pontifexToast.success('✓ Cliente actualizado'),
    deleted: () => pontifexToast.success('✓ Cliente eliminado'),
  },
  
  solicitud: {
    created: () => pontifexToast.success('✓ Solicitud creada exitosamente'),
    updated: () => pontifexToast.success('✓ Solicitud actualizada'),
    deleted: () => pontifexToast.success('✓ Solicitud eliminada'),
    submitted: () => pontifexToast.success('✓ Solicitud enviada'),
  },
  
  banco: {
    created: () => pontifexToast.success('✓ Banco creado exitosamente'),
    updated: () => pontifexToast.success('✓ Banco actualizado'),
    deleted: () => pontifexToast.success('✓ Banco eliminado'),
  },
  
  documento: {
    uploaded: () => pontifexToast.success('✓ Documento subido correctamente'),
    uploadError: () => pontifexToast.error('✗ Error al subir el documento'),
    processing: () => pontifexToast.loading('Procesando documento...'),
  },
  
  // Copiar/Descargar
  copied: () => pontifexToast.success('✓ Copiado al portapapeles'),
  downloaded: () => pontifexToast.success('✓ Descarga completada'),
}

// Exportar también el toast raw para casos personalizados
export { toast }
export default showToast
