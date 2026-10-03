# DocAsistMD 🩺🇨🇴

**DocAsistMD** es una solución integral de escritorio (*Desktop Application*) de alto rendimiento diseñada específicamente para consultorios médicos particulares y clínicas ambulatorias en **Colombia**.

Combina la velocidad y seguridad de **Rust + Tauri 2** con una interfaz médica moderna en **React 19 + TypeScript + Vite + Tailwind CSS 4**, respaldada por el motor transaccional embebido **Firebird SQL 5.0** (100% offline y sin necesidad de configurar servidores de base de datos externos).

---

## 🏛️ Cumplimiento Normativo Sanitario (Colombia)

DocAsistMD está adaptado a las regulaciones sanitarias de **MinSalud**, la **DIAN** y los estándares clínicos de Colombia:

* 📄 **RIPS en Formato JSON (Resolución 948 de 2026 / Res. 2275 de 2023):**
  * Generación y exportación oficial del paquete **RIPS en formato JSON**, soporte obligatorio de la Factura Electrónica de Venta (FEV) en salud para el Mecanismo Único de Validación (**MUV**) y obtención del **CUV** (*Código Único de Validación*).
* 📋 **Historia Clínica Electrónica (Resolución 1995 de 1999 y Ley 2015 de 2020):**
  * Expediente clínico completo: Anamnesis, motivo de consulta, antecedentes patológicos, quirúrgicos, alérgicos, farmacológicos, familiares y ginecoobstétricos.
  * **Signos vitales estructurados:** Presión arterial (sistólica/diastólica), frecuencia cardíaca, respiratoria, temperatura y saturación SpO2.
  * **Calculadora antropométrica de IMC:** Cálculo automático reactivo del Índice de Masa Corporal con categorización según la OMS (*Bajo peso, Normal, Sobrepeso, Obesidad I, II y III*).
* 🏥 **Catálogo Asistido CIE-10 y CUPS:**
  * Búsqueda instantánea de diagnósticos **CIE-10** frecuentes en consulta externa.
  * Clasificación RIPS del tipo de diagnóstico (*Impresión diagnóstica, Confirmado nuevo, Confirmado repetido*).
  * Procedimientos clasificados según **CUPS** (consulta general, especializada, telemedicina, urgencias).
* 📑 **Certificados de Incapacidad Médica Oficial:**
  * Emisión e impresión de certificados de incapacidad laboral/escolar con días en números y letras, fecha inicio/fin, indicación de prórroga y código CIE-10.
* 💊 **Prescripción Médica (Decreto 2200 de 2005):**
  * Fórmulas médicas en **Denominación Común Internacional (DCI / principio activo)**.
  * Dispensación atómica sincronizada con el inventario de medicamentos del consultorio.
  * Generación de receta médica en PDF con código QR y verificación criptográfica.
* 🪪 **Tipos de Identificación de Colombia:**
  * Soporte para `CC` (Cédula de Ciudadanía), `TI` (Tarjeta de Identidad), `CE` (Cédula de Extranjería), `RC` (Registro Civil), `PA` (Pasaporte) y **`PPT` (Permiso por Protección Temporal)**.
* 🔒 **Protección de Datos Sensibles (Ley 1581 de 2012 de Habeas Data):**
  * Cifrado en reposo a nivel de campo con **AES-256-GCM** para datos médicos sensibles.
  * Pista de auditoría inmutable (`audit_log`) que registra accesos y modificaciones.
  * Autenticación basada en roles (RBAC) con tokens de sesión estrictamente en memoria (*Zero disk leakage*).

---

## 🚀 Arquitectura y Tecnologías

| Capa | Tecnologías | Descripción |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS 4 | Interfaz rápida y accesible. **Code-splitting** con `React.lazy` y `<Suspense>` para optimizar el bundle inicial (< 280 kB). |
| **Estado y Caché** | TanStack React Query, Zustand | Caché asíncrona y almacén en memoria reactivo. |
| **Backend Nativo** | Rust, Tauri 2 Framework | Lógica de negocio segura, libre de fugas de memoria y comunicación IPC nativa. |
| **Criptografía** | Rust (`ring`, `AES-256-GCM`) | Cifrado a nivel de campo para notas médicas y diagnósticos. |
| **Reportes** | Rust (`genpdf`, `rust_xlsxwriter`) | Generación nativa de PDFs (recetas, informes) y hojas de cálculo Excel (`.xlsx`). |
| **Base de Datos** | Firebird SQL 5.0 (Embedded) | Base de datos relacional ACID embebida en el cliente, rápida y sin instalación de servidores. |

Para más detalles sobre la arquitectura y la legislación sanitaria, consulte [docs/ARQUITECTURA_Y_NORMATIVA_COLOMBIA.md](docs/ARQUITECTURA_Y_NORMATIVA_COLOMBIA.md).

---

## 🌟 Módulos Funcionales

1. **Dashboard General:** Indicadores clave de rendimiento, citas de la jornada, métricas de pacientes y alertas de stock de medicamentos.
2. **Pacientes:** Ficha médica completa, datos demográficos, contactos de emergencia y alertas clínicas.
3. **Agenda y Citas:** Control de citas médicas (programadas, confirmadas, en curso, atendidas, canceladas).
4. **Historia Clínica y Consultas:** Registro de evoluciones médicas con asistente CIE-10, signos vitales e IMC automático.
5. **Incapacidades Médicas:** Generador de certificados oficiales listos para imprimir.
6. **Farmacia e Inventario:** Control de existencias, fechas de vencimiento, alertas de stock mínimo y registro de movimientos de entrada/salida.
7. **Facturación:** Emisión de facturas con cálculo de impuestos, métodos de pago (efectivo, tarjeta, transferencia) y estado de cobros.
8. **Reportes y RIPS MinSalud:** Informes financieros por médico y periodo (PDF/Excel) y **generador de paquetes RIPS JSON** para el MUV/FEV.
9. **Auditoría:** Trazabilidad completa de acciones y cambios en el sistema.
10. **Configuración y Seguridad:** Gestión de usuarios y roles (Administrador, Médico, Recepcionista).

---

## 🛠️ Requisitos de Desarrollo

Para ejecutar o compilar el proyecto en entorno local:

1. [Node.js (v18+)](https://nodejs.org/) y `npm`
2. [Rust](https://rustup.rs/) (herramientas `cargo` y `rustc`)
3. Dependencias de desarrollo de [Tauri 2](https://v2.tauri.app/)
4. Librerías de cliente de **Firebird** (`fbclient.dll` en Windows disponible en el directorio bundled o en el `PATH` del sistema).

---

## 🖥️ Ejecución en Desarrollo

Instalar dependencias del frontend:

```bash
npm install
```

Ejecutar la suite de pruebas unitarias:

```bash
# Pruebas de Frontend (Vitest)
npm test

# Pruebas de Backend (Rust)
cd src-tauri
cargo test
```

Iniciar la aplicación en modo desarrollo (inicia el servidor Vite y la ventana nativa de Tauri):

```bash
npm run tauri dev
```

La base de datos de Firebird (`docasistmd.fdb`) se creará y migrará automáticamente la primera vez que se inicie la aplicación en `AppData/Roaming/DocAsistMD/`.

---

## 🏗️ Compilación para Producción

Para compilar el ejecutable e instalador final de Windows:

```bash
npm run tauri build
```

El instalador optimizado (`.msi` o `.exe`) estará disponible en `src-tauri/target/release/bundle/`.

---

## 📄 Licencia

Este proyecto está licenciado bajo los términos de la **GNU Affero General Public License v3.0 (AGPL-3.0-or-later)**. Consulte el archivo [LICENSE](LICENSE) para más información.

---
*Desarrollado para consultorios y profesionales de la salud por CORJAR Computers.*
