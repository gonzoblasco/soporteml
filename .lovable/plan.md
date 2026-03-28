

## Diagnóstico: Error al desconectar y forzar sincronización de MercadoLibre

### Problema identificado

Ambos botones ("Desconectar" y "Forzar sincronización") fallan con el mismo error genérico. La investigación revela:

1. **La edge function `disconnect-meli` no tiene logs** — ni siquiera boot/shutdown. Esto indica que probablemente no está deployada o falla inmediatamente al iniciar.
2. **La edge function `sync-meli-questions` solo muestra boot/shutdown** sin procesamiento real, sugiriendo que falla silenciosamente (posiblemente por `MELI_APP_ID` o `MELI_SECRET_KEY` no configurados).
3. **Ambas funciones comparten el patrón de verificación** con `has_membership_role` RPC — si el usuario no tiene rol `admin` en `memberships`, reciben 403.

### Causa raíz probable

- **`disconnect-meli` no está deployada.** Sin logs de ningún tipo = la función no existe en el runtime.
- **Posible falta de secrets** (`MELI_APP_ID`, `MELI_SECRET_KEY`) que causan crash en `sync-meli-questions`.

### Plan de corrección

#### 1. Deploy de `disconnect-meli`
Asegurar que la función esté deployada usando la herramienta de deploy.

#### 2. Hacer `disconnect-meli` más resiliente
El disconnect actual es simple (delete from `meli_tokens`) y no debería fallar. Pero agregaremos mejor logging y manejo de errores para diagnosticar si el problema es de permisos (403) o de base de datos.

#### 3. Mejorar el manejo de errores en el frontend
En `MeliConnectionSection.tsx`, mostrar el mensaje de error específico del backend en lugar del genérico "No se pudo desconectar":

```typescript
const handleDisconnect = async () => {
  setDisconnecting(true);
  const { error, data } = await supabase.functions.invoke('disconnect-meli', {
    body: { company_id: currentCompanyId },
  });
  if (error) {
    // Mostrar el error real para facilitar debugging
    const msg = error.message || 'No se pudo desconectar. Intentá de nuevo.';
    toast({ title: 'Error', description: msg, variant: 'destructive' });
  } else { ... }
};
```

Mismo patrón para `SyncButton`.

#### 4. Verificar secrets configurados
Confirmar que `MELI_APP_ID` y `MELI_SECRET_KEY` estén configurados como secrets en el proyecto.

#### 5. Actualizar CHANGELOG

### Detalle técnico

- Se re-deployará `disconnect-meli` para que esté disponible
- Se mejorarán los mensajes de error en ambos botones para mostrar la causa real (403 forbidden, function not found, etc.)
- Se verificará la existencia de los secrets necesarios

