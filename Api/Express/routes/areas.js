const express = require('express');
const router = express.Router();
const pool = require('../db');
const registrarMovimiento = require('../utils/movimientos');

// Obtener todas las áreas activas con nombre del piso
router.get('/', async (req, res) => {
  try {
    const [areas] = await pool.query(`
      SELECT a.*, f.name AS floor_name 
      FROM areas a 
      JOIN floors f ON a.id_floor = f.id
      WHERE a.status = 1
    `);
    res.json(areas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las áreas', details: error.message });
  }
});

// Verificar si ya existe un área activa con el mismo nombre
router.get('/check-name/:name', async (req, res) => {
  const { name } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT id FROM areas WHERE name = ? AND status = 1',
      [name]
    );
    res.json(rows.length > 0);
  } catch (error) {
    res.status(500).json({ error: 'Error al verificar nombre', details: error.message });
  }
});

// Crear nueva área (verificando si ya existía eliminada)
router.post('/', async (req, res) => {
  const { name, description, id_floor } = req.body;
  const userId = req.user?.id || 1;

  try {
    const [existingRows] = await pool.query('SELECT * FROM areas WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))', [name]);

    if (existingRows.length > 0) {
      const existente = existingRows[0];
      if (existente.status === 0) {
        return res.status(409).json({
          message: 'Área ya existe pero está eliminada',
          id: existente.id,
          reactivable: true
        });
      } else {
        return res.status(409).json({ message: 'Ya existe un área con ese nombre' });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO areas (name, description, id_floor) VALUES (?, ?, ?)`,
      [name, description, id_floor]
    );

    await registrarMovimiento({
      table: 'areas',
      type: 1,
      objectId: result.insertId,
      userId,
      before: null,
      after: { name, description, id_floor }
    });

    res.status(201).json({ message: 'Área registrada correctamente', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar el área', details: error.message });
  }
});

// Restablecer un área previamente eliminada
router.put('/restablecer/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE areas SET status = 1 WHERE id = ?', [id]);
    res.json({ message: 'Área reactivada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al restablecer el área' });
  }
});

// Obtener un área por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [[area]] = await pool.query(`
      SELECT a.*, f.name AS floor_name 
      FROM areas a 
      JOIN floors f ON a.id_floor = f.id 
      WHERE a.id = ?`, [id]);

    if (!area) return res.status(404).json({ error: 'Área no encontrada' });

    res.json(area);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el área' });
  }
});

// Actualizar área
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, id_floor } = req.body;
  const userId = req.user?.id || 1;

  try {
    const [rows] = await pool.query('SELECT * FROM areas WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Área no encontrada' });

    const before = rows[0];

    await pool.query(
      `UPDATE areas SET name = ?, description = ?, id_floor = ? WHERE id = ?`,
      [name, description, id_floor, id]
    );

    const [afterRows] = await pool.query('SELECT * FROM areas WHERE id = ?', [id]);
    const after = afterRows[0] || {};

    await registrarMovimiento({
      table: 'areas',
      type: 2,
      objectId: parseInt(id),
      userId,
      before,
      after
    });

    res.json({ message: 'Área actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar área', details: error.message });
  }
});

// Eliminación lógica con validación de dispositivos asignados vía responsivas
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || 1;

  try {
    const [rows] = await pool.query('SELECT * FROM areas WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Área no encontrada' });

    const before = rows[0];

    const [[{ total }]] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM responsivas r
      JOIN responsiva_equipos re ON r.id = re.id_responsiva
      JOIN devices d ON re.id_device = d.id
      WHERE r.id_area = ? AND r.status = 1 AND d.status = 1
    `, [id]);

    if (total > 0) {
      return res.status(409).json({
        error: `No se puede eliminar el área porque tiene dispositivos asignados.`
      });
    }

    await pool.query('UPDATE areas SET status = 0 WHERE id = ?', [id]);

    await registrarMovimiento({
      table: 'areas',
      type: 3,
      objectId: parseInt(id),
      userId,
      before,
      after: null
    });

    res.json({ message: 'Área eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el área', details: error.message });
  }
});

module.exports = router;
