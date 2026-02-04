# AppInventarios

Una solución integral para la administración y control de activos, desarrollada con las últimas tecnologías web para garantizar rendimiento y escalabilidad.

## 📋 Descripción General

Este proyecto es una aplicación web robusta diseñada para facilitar el seguimiento de inventarios, asignación de equipos y gestión de ubicaciones. Combina un frontend moderno y reactivo construido con **Angular 19** y una API RESTful eficiente en **Node.js (Express v5)** con persistencia en **MySQL**.

## ✨ Características Principales

*   **Gestión Completa de Activos**:
    *   **Equipos**: Registro detallado de hardware y activos.
    *   **Categorías**: Organización flexible de los tipos de activos.
    *   **Ubicaciones**: Control de dónde se encuentran físicamente los activos.
    *   **Asignaciones**: Trazabilidad de qué usuario tiene asignado qué equipo.
*   **Reportes Avanzados**:
    *   Generación de reportes exportables en múltiples formatos: **PDF**, **Excel** y **CSV**.
*   **Seguridad**:
    *   Autenticación segura mediante **JWT (JSON Web Tokens)**.
    *   Encriptación de contraseñas con **Bcrypt**.
*   **Mantenimiento Automático**:
    *   Sistema automatizado de copias de seguridad de la base de datos (Backup).

## 🚀 Tecnologías Utilizadas

### Frontend (Angular)
*   **Framework**: Angular 19
*   **Lenguaje**: TypeScript
*   **Librerías Clave**:
    *   `RxJS`: Manejo de flujos de datos asíncronos.
    *   `jsPDF` & `jspdf-autotable`: Generación de reportes PDF en el cliente.
    *   `File-saver`: Manejo de descargas de archivos.

### Backend (API)
*   **Runtime**: Node.js
*   **Framework**: Express v5
*   **Base de Datos**: MySQL (con `mysql2`)
*   **Herramientas Clave**:
    *   `JWT`: Autenticación segura.
    *   `Multer`: Manejo de subida de archivos.
    *   `Node-cron`: Tareas programadas (backups).
    *   `PDFKit` & `ExcelJS`: Generación de documentos en el servidor.

### Infraestructura
*   **Docker**: Contenerización de la aplicación y base de datos.
*   **Nginx**: Servidor web y proxy inverso (en el contenedor de Angular).

## 📸 Galería

| Asignación de Equipos | Categorías |
|:---:|:---:|
| ![Asignacion](./Capturas/Asignacion.png) | ![Categorias](./Capturas/Categorias.png) |

| Ubicaciones | Listado de Equipos |
|:---:|:---:|
| ![Ubicaciones](./Capturas/Ubicaciones.png) | ![Equipos](./Capturas/equipos.png) |

**Generacion de reportes**
![Reportes](./Capturas/Reportes.png)

## 📂 Estructura del Proyecto

```bash
AplicacioInventarios/
├── Angular/            # Código fuente del Frontend (Angular)
│   ├── AppInventarios/
│   └── Dockerfile
├── Api/                # Código fuente del Backend (Express)
│   ├── Express/
│   └── Dockerfile
├── Capturas/           # Imágenes demostrativas
├── DataBase/           # Scripts o archivos relacionados a la DB
├── docker-compose.yml  # Orquestación de contenedores
└── ...
```


## Ejecución

### Requisitos Previos

*   **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**: Necesario para ejecutar la aplicación.


Para levantar la aplicación, abre una terminal en la raíz del proyecto y ejecuta:

```bash
docker-compose up -d --build
```

## Acceso y Credenciales

Puedes acceder a la aplicación en: **[http://localhost:4200](http://localhost:4200)** (Interfaz de Usuario)

### Usuario por defecto
*   **Usuario:** `Admin`
*   **Contraseña:** `admin123@`

## Importación de Base de Datos

Si necesitas importar los datos, esta opción se encuentra disponible en la aplicación dentro de la vista de **Configuración** > **Exportar Datos** y seleccionar el archivo BKP-2026-01-29.sql que se encuentra en la carpeta del proyecto.
