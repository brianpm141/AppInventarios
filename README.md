# AppInventarios

Aplicación web para la gestión de inventarios de equipos de cómputo y materiales de servicio.

## Requisitos Previos

*   **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**: Necesario para ejecutar la aplicación.

## Ejecución

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
