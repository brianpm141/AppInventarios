const express = require('express');
const router = express.Router();
const pool = require('../db');
const registrarMovimiento = require('../utils/movimientos');

// Obtener todos los pisos
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM floors WHERE status = 1');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pisos' });
  }
});

// Obtener piso por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM floors WHERE id = ? AND status = 1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Piso no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al buscar piso' });
  }
});

// Crear nuevo piso (con verificación de eliminados)
router.post('/', async (req, res) => {
  const { name, description } = req.body;
  const userId = req.user?.id || 1;

  try {
    const [rows] = await pool.query('SELECT * FROM floors WHERE name = ?', [name]);

    if (rows.length > 0) {
      const piso = rows[0];
      if (piso.status === 0) {
        return res.status(409).json({
          message: 'Piso ya existe pero está eliminado',
          id: piso.id,
          reactivable: true
        });
      } else {
        return res.status(409).json({ message: 'Ya existe un piso con ese nombre' });
      }
    }

    const [result] = await pool.query(
      'INSERT INTO floors (name, description, status) VALUES (?, ?, 1)', [name, description]
    );

    await registrarMovimiento({
      table: 'floors',
      type: 1,
      objectId: result.insertId,
      userId,
      before: null,
      after: { name, description }
    });

    res.status(201).json({ message: 'Piso registrado correctamente', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar el piso', details: error.message });
  }
});

// Actualizar piso
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    await pool.query('UPDATE floors SET name = ?, description = ? WHERE id = ?', [name, description, id]);
    res.json({ message: 'Piso actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar piso' });
  }
});

// Eliminar piso (borrado lógico con verificación de áreas)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || 1;

  try {
    // Verificar si hay áreas activas en este piso
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM areas WHERE id_floor = ? AND status = 1',
      [id]
    );

    if (total > 0) {
      return res.status(409).json({ error: 'No se puede eliminar el piso porque tiene áreas asignadas.' });
    }

    const [rows] = await pool.query('SELECT * FROM floors WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Piso no encontrado' });

    const before = rows[0];

    await pool.query('UPDATE floors SET status = 0 WHERE id = ?', [id]);

    await registrarMovimiento({
      table: 'floors',
      type: 3,
      objectId: parseInt(id),
      userId,
      before,
      after: null
    });

    res.json({ message: 'Piso eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar piso', details: err.message });
  }
});

// Restaurar piso eliminado
router.put('/restore/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || 1;

  try {
    const [rows] = await pool.query('SELECT * FROM floors WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Piso no encontrado' });

    const before = rows[0];

    await pool.query('UPDATE floors SET status = 1 WHERE id = ?', [id]);

    await registrarMovimiento({
      table: 'floors',
      type: 4, // tipo 4 = restauración
      objectId: parseInt(id),
      userId,
      before,
      after: { ...before, status: 1 }
    });

    res.json({ message: 'Piso restaurado correctamente' });
  } catch (error) {
    console.error('Error al restaurar piso:', error);
    res.status(500).json({ error: 'Error al restaurar piso' });
  }
});

module.exports = router;
