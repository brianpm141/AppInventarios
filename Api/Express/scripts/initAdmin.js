const bcrypt = require('bcrypt');
const pool = require('../db'); // Asegúrate de que pool esté correctamente configurado para tu base de datos

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function createAdminUser() {
  try {
    // Comprobar si el usuario ya existe
    const [existingUser] = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      [ADMIN_USERNAME]
    );

    if (existingUser.length > 0) {
      console.log('El usuario administrador ya existe');
      return;
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Crear el usuario en la tabla 'users' y su contraseña en la tabla 'passwords'
    await pool.query('START TRANSACTION');

    // Insertar en la tabla de contraseñas
    const [passwordResult] = await pool.query(
      'INSERT INTO passwords (id,password_hash) VALUES (?,?)',
      [1,hashedPassword]
    );

    const passwordId = passwordResult.insertId;

    // Insertar en la tabla de usuarios
    await pool.query(
      'INSERT INTO users (name, last_name, username, role, password_id, status) VALUES(?, ?, ?, ?, ?, ?)',
      ['ADMIN', 'ADMiN', ADMIN_USERNAME, 1, 1, 1] // Role 1 como administrador, status 1 activo
    );

    await pool.query('COMMIT');

    console.log('Usuario administrador creado exitosamente');
  } catch (error) {
    console.error('Error creando el usuario administrador:', error);
    await pool.query('ROLLBACK');
  }
}

// Ejecutar la función
createAdminUser().finally(() => process.exit(0));
