# DocAsistMD 🩺

**DocAsistMD** es una solución integral de escritorio (Desktop App) diseñada para la gestión eficiente y segura de consultorios médicos. Desarrollada con tecnologías de vanguardia para asegurar alto rendimiento, privacidad (cumplimiento HIPAA), y una experiencia de usuario moderna e intuitiva.

## 🚀 Tecnologías

El proyecto adopta una arquitectura de alto rendimiento y bajo consumo de recursos:

- **Frontend:** React + TypeScript + Vite
- **UI & Estilos:** Tailwind CSS, shadcn/ui y Lucide Icons
- **Backend / Core:** Rust + Tauri (App nativa, segura y rápida)
- **Base de Datos:** Firebird SQL 5.0 (Embedded)

Esta arquitectura garantiza que la lógica de negocio y los datos sensibles residan íntegramente en el entorno nativo, reduciendo la superficie de ataque y permitiendo que la aplicación funcione *offline* o sin un servidor central complejo gracias al motor embebido de Firebird.

## 🌟 Características Principales (Roadmap)

- 👥 **Gestión de Pacientes:** Registro detallado de información, datos de contacto, seguros médicos y alertas de salud (alergias).
- 📅 **Agendamiento Inteligente:** Calendario de citas, asignación a médicos, estados de citas (Programada, En Curso, Completada, etc.).
- ⚕️ **Módulo Médico:** Gestión de profesionales, especialidades, y disponibilidad.
- 💳 **Facturación y Pagos:** Emisión de facturas, seguimiento de cobros, y métricas financieras.
- 📋 **Historia Clínica (EHR):** (En desarrollo)
- 💊 **Prescripciones Médicas:** (En desarrollo)

## 🛠️ Requisitos de Desarrollo

Para correr el proyecto en entorno de desarrollo, asegúrate de tener instalado:

1. [Node.js (v18+)](https://nodejs.org/) y `npm`
2. [Rust](https://rustup.rs/) (cargo)
3. Las dependencias de desarrollo de [Tauri (Guía Oficial)](https://tauri.app/v1/guides/getting-started/prerequisites)
4. Librerías de **Firebird** (Para Windows, `fbclient.dll` debe estar en el sistema o junto al ejecutable).

## 🖥️ Iniciar el Proyecto

Instala las dependencias del frontend:

```bash
npm install
```

Ejecuta el entorno de desarrollo (esto iniciará tanto el servidor de Vite como la ventana de Tauri en Rust):

```bash
npm run tauri dev
```

La base de datos de Firebird (`docasistmd.fdb`) se creará automáticamente la primera vez que inicies la aplicación en la ruta `AppData/Roaming/DocAsistMD/` de tu usuario.

## 🏗️ Construcción para Producción

Para generar el ejecutable final optimizado:

```bash
npm run tauri build
```

El instalador y el ejecutable estarán disponibles en la carpeta `src-tauri/target/release/bundle/`.

---
*Desarrollado para CORJAR Computers.*
