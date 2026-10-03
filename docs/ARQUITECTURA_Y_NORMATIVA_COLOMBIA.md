# DocAsistMD — Arquitectura Técnica y Normativa para Colombia 🩺🇨🇴

Documento técnico y regulatorio de **DocAsistMD**, aplicación de escritorio especializada para la gestión integral de consultorios médicos particulares y clínicas ambulatorias en Colombia.

---

## 1. Marco Regulatorio Sanitario en Colombia

DocAsistMD incorpora en su diseño y flujos de trabajo los requerimientos legales vigentes establecidos por el **Ministerio de Salud y Protección Social (MinSalud)**, la **DIAN**, la **Superintendencia Nacional de Salud** y la **Registraduría Nacional**:

### 1.1. RIPS en Formato JSON — Resolución 948 de 2026 (y Res. 2275 de 2023)
* **Obligatoriedad del soporte FEV:** El Registro Individual de Prestación de Servicios de Salud (RIPS) constituye el soporte electrónico obligatorio de la Factura Electrónica de Venta (FEV) en salud.
* **Transición de archivos planos a JSON:** Los antiguos archivos planos `.txt` de la Resolución 3374 han sido sustituidos definitivamente por la estructura jerárquica en formato **JSON**.
* **Mecanismo Único de Validación (MUV):** El sistema compila las consultas médicas en la estructura oficial requerida por el MUV para la obtención del **CUV** (*Código Único de Validación*), permitiendo la posterior radicación de cuentas ante entidades responsables de pago o auditoría.
* **Estructura RIPS generada:**
  * Bloque de control de obligado: `numDocumentoIdObligado`, `numFactura`.
  * Bloque `usuarios`: Identificación, tipo de usuario (`01` Contributivo, `05` Particular), fecha de nacimiento, sexo, lugar de residencia según código DANE (`11001`, etc.).
  * Bloque `servicios.consultas`: Código del prestador (REPS de 12 dígitos), fecha y hora de atención, código del procedimiento **CUPS**, modalidad de atención (`01` Intramural, `03` Telemedicina), causa externa, diagnóstico principal **CIE-10**, tipo de diagnóstico y valor del servicio.

### 1.2. Historia Clínica Electrónica — Resolución 1995 de 1999 y Ley 2015 de 2020
* **Estructura clínica completa:**
  * Datos generales del usuario y contacto.
  * Motivo de consulta y enfermedad actual.
  * Antecedentes clasificados (patológicos, quirúrgicos, farmacológicos, alérgicos, familiares y ginecoobstétricos).
  * Examen físico con signos vitales estructurados (PA sistólica/diastólica, frecuencia cardíaca, respiratoria, temperatura, saturación SpO2) y antropometría (peso en kg y talla en cm).
  * **Cálculo automático de IMC:** Clasificación inmediata según criterios de la Organización Mundial de la Salud (Bajo peso, Normal, Sobrepeso, Obesidad I, II y III).
  * Diagnóstico codificado bajo el catálogo oficial **CIE-10 / CIE-11**.
  * Plan de conducta y tratamiento médico.

### 1.3. Prescripción Médica (Fórmula Médica) — Decreto 2200 de 2005
* **Denominación Común Internacional (DCI):** Obligatoriedad de prescribir medicamentos por su principio activo y concentración.
* **Trazabilidad de dispensación:** Integración directa con el inventario de medicamentos del consultorio con registro atómico de movimientos y opción de reversión auditada.
* **Código QR y verificación:** Generación de recetas en PDF con código QR y código de verificación criptográfico.

### 1.4. Certificados e Incapacidades Médicas Oficiales
* Emisión e impresión de certificados de reposo médico con:
  * Número de días de incapacidad expresados en dígitos y en letras.
  * Fechas exactas de inicio y culminación.
  * Clasificación de origen (*Inicial* o *Prórroga*).
  * Código diagnóstico CIE-10 y descripción.
  * Identificación del profesional con Registro Médico / Tarjeta Profesional.

### 1.5. Tipos de Documento de Identificación en Colombia
El sistema reconoce la tipología oficial de documentos de identidad:
* `CC`: Cédula de Ciudadanía
* `TI`: Tarjeta de Identidad
* `CE`: Cédula de Extranjería
* `RC`: Registro Civil de Nacimiento
* `PA`: Pasaporte
* `PPT`: Permiso por Protección Temporal (Decreto 216 de 2021 para población migrante)
* `NIT`: Número de Identificación Tributaria

### 1.6. Protección de Datos y Habeas Data — Ley 1581 de 2012
* Los datos de salud tienen categoría de **datos sensibles**.
* **Cifrado de campos sensibles:** Implementado en Rust con **AES-256-GCM** para diagnósticos, notas clínicas, síntomas y antecedentes en la base de datos.
* **Pista de auditoría inmutable (`audit_log`):** Registro de cada creación, lectura, modificación o reversión realizada por los usuarios (administradores, médicos, recepcionistas).

---

## 2. Arquitectura de Software y Tecnologías

DocAsistMD está construido bajo una arquitectura de escritorio moderna de dos capas:

```
┌────────────────────────────────────────────────────────┐
│               PRESENTACIÓN (Frontend)                  │
│   React 19  +  TypeScript  +  Vite  +  Tailwind CSS 4  │
│   - Code-Splitting de rutas con React.lazy & Suspense │
│   - TanStack React Query para caché reactiva          │
│   - Zustand para estado en memoria de sesión y UI     │
│   - Asistente de búsqueda CIE-10 y CUPS               │
│   - Calculadora antropométrica de IMC                 │
│   - Generador y visor interactivo de RIPS JSON        │
└───────────────────────────┬────────────────────────────┘
                            │ Tauri IPC Commands
┌───────────────────────────▼────────────────────────────┐
│                 NÚCLEO NATIVO (Backend)                │
│                 Rust (Tauri 2 Framework)               │
│   - Manejo seguro de memoria y concurrencia            │
│   - Sesiones estrictamente en memoria (Zero-leakage)   │
│   - Criptografía AES-256-GCM con ring                  │
│   - Generación de reportes PDF y Excel (.xlsx nativo) │
│   - Exportación e importación de copias con gbak      │
└───────────────────────────┬────────────────────────────┘
                            │ rsfbclient (embedded)
┌───────────────────────────▼────────────────────────────┐
│                 ALMACENAMIENTO DE DATOS                │
│            Firebird SQL 5.0 (Embedded Engine)          │
│   - 100% Offline, sin necesidad de servidor central    │
│   - ACID complaciente, transaccional y robusto         │
│   - Control automático de migraciones (schema_migrations)│
└────────────────────────────────────────────────────────┘
```

---

## 3. Optimizaciones de Rendimiento y Frontend (React 19 + Vite)

1. **Reducción del Bundle Inicial (-45.6%):**
   * Previo: `dist/assets/index.js` superaba los 510 kB al cargar todas las vistas de forma síncrona.
   * Optimización: Adopción de `React.lazy` y `<Suspense>` a nivel de enrutador en `App.tsx`.
   * Resultado: El bundle inicial bajó a **277.9 kB**, distribuyendo cada módulo en micro-chunks bajo demanda.
2. **Formateo Numérico Especializado:**
   * Uso de `font-variant-numeric: tabular-nums` para evitar saltos ópticos en tablas de facturación, cifras en pesos colombianos (`COP`) y métricas de signos vitales.
3. **Control de Errores y Degradación Segura:**
   * `ErrorBoundary` global para captura de fallos imprevistos en la interfaz.

---

## 4. Suites de Pruebas Automatizadas

El proyecto cuenta con doble verificación automatizada:

* **Frontend (Vitest):**
  * Verificación de permisos y roles (RBAC).
  * Manejo seguro de sesiones en memoria con fallback ante fallos del store.
  * Cálculo antropométrico de IMC y formateo de signos vitales.
  * Mapeo de identificaciones y generación de RIPS JSON conforme a la Res. 948.
  * *Resultado:* **26/26 tests PASS (100%)**.

* **Backend (Rust `cargo test`):**
  * Validación de tokens HMAC y expiración.
  * Cifrado y descifrado simétrico AES-256-GCM con soporte para registros legados.
  * Integridad de transacciones, dispensación atómica y reversiones pareadas de inventario.
  * Ciclo de vida estricto de sesiones en memoria (sin persistencia no autorizada en disco).
  * *Resultado:* **57/57 tests PASS (100%)**.
