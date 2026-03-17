## Enfoque para tests de BBDD y RLS

### 1. Alcance

- Verificar que las políticas RLS de Supabase y el modelo multi-tenant se comportan como se espera:
  - Usuarios sólo pueden ver datos de su `company_id`.
  - Roles (`admin`, `agent`) tienen permisos diferenciados cuando corresponda.

### 2. Fase actual

- En esta iteración **no se implementarán aún tests automatizados de RLS**, pero se deja definido el enfoque para añadirlos más adelante sin bloquear la adopción de tests de frontend y Edge Functions.

### 3. Estrategia propuesta (para una fase posterior)

- **Opción simple (scripts + `psql`)**:
  - Levantar una instancia de Postgres (local o en contenedor) con el esquema de `supabase/migrations/*.sql` aplicado.
  - Crear un script de seed que inserte:
    - 2 empresas (Company A, Company B).
    - 1–2 usuarios por empresa con diferentes roles.
    - Preguntas, productos y demás registros mínimos para probar permisos.
  - Ejecutar, vía `psql`, una serie de consultas autenticadas como cada rol/empresa y comprobar:
    - Que los `SELECT` sólo devuelven filas de la empresa correcta.
    - Que los `INSERT/UPDATE/DELETE` se aceptan o rechazan según el rol.

- **Opción avanzada (`pgTAP`)**:
  - Añadir `pgTAP` al entorno de desarrollo de BBDD.
  - Escribir tests declarativos del tipo:
    - `SELECT has_policy('questions', 'select_own_company_only');`
    - `SELECT results_eq(...)` para casos específicos.

### 4. Integración futura

- Cuando se priorice esta fase:
  - Añadir un comando de npm/script de CI que:
    - Levante la base de datos.
    - Aplique migraciones.
    - Ejecute los tests SQL.
  - Ejecutar estos tests al menos en la rama principal y en PRs que toquen `supabase/migrations/**`.

