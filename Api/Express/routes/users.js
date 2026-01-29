const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const registrarMovimiento = require('../utils/movimientos');

// (1) Obtener todos los usuarios activos
router.get('/', async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT id, name AS nombre, last_name AS apellidos, username AS usuario, role
      FROM users 
      WHERE status = 1
      ORDER BY id DESC
    `);
    res.json(results);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ message: err.message });
  }
});

// (2) Obtener usuario por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [results] = await pool.query('SELECT * FROM users WHERE id = ? AND status = 1', [id]);
    if (!results.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(results[0]);
  } catch (err) {
    console.error('Error al obtener usuario por ID:', err);
    res.status(500).json({ message: err.message });
  }
});

// (3) Crear usuario
router.post('/', async (req, res) => {
  const { nombre, apellidos, usuario, rol, contrasena, userId } = req.body;

  if (!nombre || !apellidos || !usuario || !rol || !contrasena || !userId) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    console.log('Datos recibidos:', { nombre, apellidos, usuario, rol, userId });

    const [existingUsers] = await conn.query(
      'SELECT id FROM users WHERE username = ? AND status = 1',
      [usuario]
    );
    if (existingUsers.length > 0) {
      await conn.rollback();
      return res.status(409).json({ message: 'El nombre de usuario ya está en uso' });
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);
    console.log('Password hasheada:', hashedPassword);

    const [passResult] = await conn.query(
      'INSERT INTO passwords (password_hash) VALUES (?)',
      [hashedPassword]
    );

    const [userResult] = await conn.query(
      `INSERT INTO users (name, last_name, username, role, password_id, status)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [nombre, apellidos, usuario, rol, passResult.insertId]
    );

    await registrarMovimiento({
      table: 'users',
      type: 1,
      objectId: userResult.insertId,
      userId,
      before: null,
      after: { nombre, apellidos, usuario, rol }
    });

    await conn.commit();
    res.status(201).json({ id: userResult.insertId, nombre, apellidos, usuario, rol });
  } catch (err) {
    await conn.rollback();
    console.error('Error al registrar usuario:', err);
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

// (4) Actualizar usuario
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, apellidos, usuario, rol, contrasena, userId } = req.body;

  if (!nombre || !apellidos || !usuario || !rol || !userId) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [beforeRows] = await conn.query('SELECT * FROM users WHERE id = ?', [id]);
    if (!beforeRows.length) return res.status(404).json({ message: 'Usuario no encontrado' });

    await conn.query(
      `UPDATE users
       SET name = ?, last_name = ?, username = ?, role = ?
       WHERE id = ? AND status = 1`,
      [nombre, apellidos, usuario, rol, id]
    );

    if (contrasena && contrasena.trim() !== '') {
      const hashedPassword = await bcrypt.hash(contrasena, 10);
      const [passResult] = await conn.query(
        'INSERT INTO passwords (password_hash) VALUES (?)',
        [hashedPassword]
      );
      await conn.query(
        'UPDATE users SET password_id = ? WHERE id = ?',
        [passResult.insertId, id]
      );
    }

    const [afterRows] = await conn.query('SELECT * FROM users WHERE id = ?', [id]);

    await registrarMovimiento({
      table: 'users',
      type: 2,
      objectId: parseInt(id),
      userId,
      before: beforeRows[0],
      after: afterRows[0]
    });

    await conn.commit();
    res.json({ id: Number(id), nombre, apellidos, usuario, rol });
  } catch (err) {
    await conn.rollback();
    console.error('Error al actualizar usuario:', err);
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

// Eliminar usuario (soft delete)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'Falta el ID del usuario que realiza la acción' });
  }

  // 🔒 Bloqueo directo si el ID es 1
  if (parseInt(id) === 1) {
    return res.status(403).json({ message: 'No es posible eliminar al usuario administrador.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, username, status FROM users WHERE id = ?',
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });

    await pool.query('UPDATE users SET status = 0 WHERE id = ?', [id]);

    await registrarMovimiento({
      table: 'users',
      type: 3,
      objectId: parseInt(id),
      userId,
      before: rows[0],
      after: null
    });

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
