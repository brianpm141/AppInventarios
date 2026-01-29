# ./mysql/initdb/01-init.sh
#!/bin/bash
set -e

# 1) Crear la base de datos (usa MYSQL_DATABASE del .env)
mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<-EOSQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOSQL

# 2) Crear el usuario de la API (usa API_DB_USER y API_DB_PASSWORD)
mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<-EOSQL
CREATE USER IF NOT EXISTS '${API_DB_USER}'@'%' 
  IDENTIFIED BY '${API_DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE
  ON \`${MYSQL_DATABASE}\`.*
  TO '${API_DB_USER}'@'%';
FLUSH PRIVILEGES;
-- 3) Seleccionar la base
USE \`${MYSQL_DATABASE}\`;

SET default_storage_engine = InnoDB;
SET NAMES utf8mb4;

-- Departamentos
CREATE TABLE departments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(60) NOT NULL UNIQUE,
    abbreviation VARCHAR(4) NOT NULL UNIQUE,
    description VARCHAR(180),
    department_head VARCHAR(60) NOT NULL,
    status TINYINT UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- Pisos
CREATE TABLE floors (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE,
    description VARCHAR(180) NOT NULL,
    status TINYINT UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- Áreas
CREATE TABLE areas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(30) NOT NULL UNIQUE,
    description VARCHAR(180),
    status TINYINT UNSIGNED NOT NULL DEFAULT 1,
    id_floor INT UNSIGNED NOT NULL,
    FOREIGN KEY (id_floor) REFERENCES floors(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CHECK (status IN (0,1))
) ENGINE=InnoDB;

-- Tabla para contraseñas
CREATE TABLE passwords (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    password_hash VARCHAR(128) NOT NULL
) ENGINE=InnoDB;

-- Usuarios
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    last_name VARCHAR(30) NOT NULL,
    username VARCHAR(25) NOT NULL UNIQUE,
    role TINYINT UNSIGNED NOT NULL DEFAULT 1,
    password_id INT UNSIGNED NOT NULL,
    status TINYINT UNSIGNED NOT NULL DEFAULT 1,
    FOREIGN KEY (password_id) REFERENCES passwords(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Categorías de dispositivos
CREATE TABLE categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE,
    description VARCHAR(180) NOT NULL,
    type TINYINT UNSIGNED NOT NULL DEFAULT 1,
    status TINYINT UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- Campos personalizados por categoría
CREATE TABLE custom_fields (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20) NOT NULL,
    data_type VARCHAR(10) NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    required TINYINT(1) DEFAULT 0,
    status TINYINT(1) DEFAULT 1,
    FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Grupos de dispositivos
CREATE TABLE device_groups (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_number SMALLINT UNSIGNED NOT NULL UNIQUE
) ENGINE=InnoDB;

-- Dispositivos
CREATE TABLE devices (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    serial_number VARCHAR(50) NOT NULL UNIQUE,
    category_id INT UNSIGNED NOT NULL,
    group_id INT UNSIGNED,
    status TINYINT UNSIGNED NOT NULL DEFAULT 1,
    details TEXT,
    func ENUM('asignado', 'resguardo', 'baja') DEFAULT 'resguardo',
    is_new TINYINT(1) NOT NULL DEFAULT 1,
    FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (group_id) REFERENCES device_groups(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;


-- Valores personalizados por dispositivo
CREATE TABLE device_custom_values (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    device_id INT UNSIGNED NOT NULL,
    custom_field_id INT UNSIGNED NOT NULL,
    value TEXT,
    FOREIGN KEY (device_id) REFERENCES devices(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (custom_field_id) REFERENCES custom_fields(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Accesorios
CREATE TABLE accessories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    brand VARCHAR(30) NOT NULL,
    product_name VARCHAR(50) NOT NULL,
    total INT UNSIGNED NOT NULL DEFAULT 0,
    category_id INT UNSIGNED NOT NULL,
    details TEXT,
    status TINYINT UNSIGNED NOT NULL DEFAULT 1,
    FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CHECK (status IN (0,1))
) ENGINE=InnoDB;


-- Movimientos registrados
CREATE TABLE movements (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    movement_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    affected_table VARCHAR(50) NOT NULL,
    change_type TINYINT UNSIGNED NOT NULL,
    after_info TEXT,
    before_info TEXT,
    object_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    status TINYINT UNSIGNED NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CHECK (status IN (0,1))
) ENGINE=InnoDB;

-- Configuración de respaldos
CREATE TABLE IF NOT EXISTS backup_config (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    tipo ENUM('diario', 'semanal', 'mensual', 'anual') NOT NULL,
    dia_semana ENUM('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo') DEFAULT NULL,
    dia_mes TINYINT UNSIGNED DEFAULT NULL,
    mes_anual ENUM('Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre') DEFAULT NULL,
    hora TIME NOT NULL,
    ultimo_respaldo DATETIME DEFAULT NULL,
    status TINYINT UNSIGNED NOT NULL DEFAULT 1,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE responsivas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(50) NOT NULL UNIQUE,
    fecha DATE NOT NULL,
    responsable VARCHAR(100) NOT NULL,
    id_area INT UNSIGNED NOT NULL,
    id_departamento INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    status TINYINT UNSIGNED NOT NULL DEFAULT 1,
    FOREIGN KEY (id_area) REFERENCES areas(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (id_departamento) REFERENCES departments(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);



CREATE TABLE responsiva_equipos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_responsiva INT UNSIGNED NOT NULL,
    id_device INT UNSIGNED NOT NULL,
    FOREIGN KEY (id_responsiva) REFERENCES responsivas(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_device) REFERENCES devices(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE (id_responsiva, id_device)
);

CREATE TABLE bajas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(50) NOT NULL UNIQUE,
    fecha DATE NOT NULL,
    motivo TEXT NOT NULL,
    detectado_por TEXT,
    observaciones TEXT,
    id_device INT UNSIGNED NOT NULL UNIQUE,
    id_departamento INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    FOREIGN KEY (id_device) REFERENCES devices(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (id_departamento) REFERENCES departments(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE mantenimientos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  responsiva_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  descripcion_falla TEXT,
  descripcion_solucion TEXT,
  user_id INT UNSIGNED NOT NULL,
  folio VARCHAR(50) NOT NULL UNIQUE,
  completo TINYINT(1) NOT NULL DEFAULT 0, -- 0=incompleto, 1=completo
  CONSTRAINT fk_responsiva FOREIGN KEY (responsiva_id) REFERENCES responsivas(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_mant_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE responsiva_documentos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_responsiva INT UNSIGNED NOT NULL,
  nombre_archivo VARCHAR(100) NOT NULL,
  ruta_archivo TEXT NOT NULL,
  fecha_subida DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id INT UNSIGNED NOT NULL,
  FOREIGN KEY (id_responsiva) REFERENCES responsivas(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE mantenimiento_documentos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_mantenimiento INT UNSIGNED NOT NULL,
  nombre_archivo VARCHAR(100) NOT NULL,
  ruta_archivo TEXT NOT NULL,
  fecha_subida DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id INT UNSIGNED NOT NULL,
  FOREIGN KEY (id_mantenimiento) REFERENCES mantenimientos(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE baja_documentos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_baja INT UNSIGNED NOT NULL,
  nombre_archivo VARCHAR(100) NOT NULL,
  ruta_archivo TEXT NOT NULL,
  fecha_subida DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id INT UNSIGNED NOT NULL,
  FOREIGN KEY (id_baja) REFERENCES bajas(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);


EOSQL