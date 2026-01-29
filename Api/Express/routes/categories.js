const express = require('express');
const router = express.Router();
const pool = require('../db');
const registrarMovimiento = require('../utils/movimientos');

// GET todas las categorías activas (con opción de filtrar por tipo)
router.get('/', async (req, res) => {
  const { type } = req.query;
  try {
    let query = 'SELECT * FROM categories WHERE status = 1';
    const params = [];

    if (type !== undefined) {
      query += ' AND type = ?';
      params.push(type);
    }

    const [results] = await pool.query(query, params);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ? AND status = 1', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Categoría no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST nueva categoría
router.post('/', async (req, res) => {
  const { name, description, type } = req.body;
  const userId = req.user?.id || 1;

  try {
    // Buscar por nombre
    const [existing] = await pool.query('SELECT * FROM categories WHERE name = ?', [name]);

    if (existing.length > 0) {
      const cat = existing[0];
      if (cat.status === 0) {
        return res.status(409).json({
          error: `La categoría '${name}' ya existía pero fue desactivada.`,
          restoreId: cat.id
        });
      } else {
        return res.status(400).json({ error: 'Ya existe una categoría activa con ese nombre.' });
      }
    }

    const [result] = await pool.query(
      'INSERT INTO categories (name, description, type, status) VALUES (?, ?, ?, 1)',
      [name, description, type]
    );

    await registrarMovimiento({
      table: 'categories',
      type: 1,
      objectId: result.insertId,
      userId,
      before: null,
      after: { name, description, type, status: 1 }
    });

    res.status(201).json({ message: 'Categoría creada', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH restaurar categoría eliminada
router.patch('/restore/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || 1;

  try {
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Categoría no encontrada' });

    const before = rows[0];

    if (before.status === 1) {
      return res.status(400).json({ error: 'La categoría ya está activa.' });
    }

    await pool.query('UPDATE categories SET status = 1 WHERE id = ?', [id]);

    await registrarMovimiento({
      table: 'categories',
      type: 4,
      objectId: parseInt(id),
      userId,
      before,
      after: { ...before, status: 1 }
    });

    res.json({ message: 'Categoría restaurada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT actualizar categoría
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, type } = req.body;
  const userId = req.user?.id || 1;

  try {
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Categoría no encontrada' });

    const before = rows[0];

    // Validar cambio de tipo
    if (type !== before.type) {
      const [[{ totalDevices }]] = await pool.query(
        'SELECT COUNT(*) AS totalDevices FROM devices WHERE category_id = ?', [id]);
      const [[{ totalAccessories }]] = await pool.query(
        'SELECT COUNT(*) AS totalAccessories FROM accessories WHERE category_id = ?', [id]);

      if (totalDevices > 0 || totalAccessories > 0) {
        return res.status(400).json({
          error: 'No se puede cambiar el tipo porque hay elementos relacionados.'
        });
      }
    }

    await pool.query(
      'UPDATE categories SET name = ?, description = ?, type = ? WHERE id = ?',
      [name, description, type, id]
    );

    await registrarMovimiento({
      table: 'categories',
      type: 2,
      objectId: parseInt(id),
      userId,
      before,
      after: { name, description, type }
    });

    res.json({ message: 'Categoría actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE desactivar categoría
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || 1;

  try {
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Categoría no encontrada' });

    const before = rows[0];

    const [[{ totalDevices }]] = await pool.query(
      'SELECT COUNT(*) AS totalDevices FROM devices WHERE category_id = ? AND status = 1', [id]);
    const [[{ totalAccessories }]] = await pool.query(
      'SELECT COUNT(*) AS totalAccessories FROM accessories WHERE category_id = ? AND status = 1', [id]);

    if (totalDevices > 0 || totalAccessories > 0) {
      return res.status(409).json({
        error: 'No se puede eliminar la categoría porque tiene elementos relacionados.'
      });
    }

    await pool.query('UPDATE categories SET status = 0 WHERE id = ?', [id]);

    await registrarMovimiento({
      table: 'categories',
      type: 3,
      objectId: parseInt(id),
      userId,
      before,
      after: null
    });

    res.json({ message: 'Categoría eliminada (status = 0)' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST agregar campo personalizado
router.post('/addField', async (req, res) => {
  const { name, data_type, category_id, required } = req.body;
  const userId = req.user?.id || 1;

  try {
    const [categoryResult] = await pool.query('SELECT * FROM categories WHERE id = ? AND status = 1', [category_id]);
    if (!categoryResult.length) return res.status(404).json({ message: 'Categoría no encontrada o desactivada' });

    const [result] = await pool.query(
      'INSERT INTO custom_fields (name, data_type, category_id, required, status) VALUES (?, ?, ?, ?, 1)',
      [name, data_type, category_id, required || 0]
    );

    await registrarMovimiento({
      table: 'custom_fields',
      type: 1,
      objectId: result.insertId,
      userId,
      before: null,
      after: { name, data_type, category_id, required: required || 0, status: 1 }
    });

    res.status(201).json({ message: 'Campo personalizado creado', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET campos personalizados
router.get('/fields/:categoryId', async (req, res) => {
  const { categoryId } = req.params;
  try {
    const [results] = await pool.query(
      'SELECT * FROM custom_fields WHERE category_id = ? AND status = 1',
      [categoryId]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE (soft) campo personalizado: bloquea si hay valores asociados
router.delete('/fields/:fieldId', async (req, res) => {
  const userId = req.user?.id || 1;
  const id = parseInt(req.params.fieldId, 10);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM custom_fields WHERE id = ? AND status = 1', [id]);
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Campo no encontrado o ya desactivado' });
    }
    const before = rows[0];

    // 🔒 Bloqueo: revisa si hay datos capturados en dispositivos
    const [[{ totalValues }]] = await conn.query(
      'SELECT COUNT(*) AS totalValues FROM device_custom_values WHERE custom_field_id = ?',
      [id]
    );
    if (totalValues > 0) {
      await conn.rollback();
      return res.status(409).json({
        error: 'No se puede eliminar/desactivar el campo: existen dispositivos con datos registrados para este campo.'
      });
    }

    await conn.query('UPDATE custom_fields SET status = 0 WHERE id = ?', [id]);

    await registrarMovimiento({
      table: 'custom_fields', type: 3, objectId: id, userId,
      before, after: { ...before, status: 0 }
    });

    await conn.commit();
    res.json({ message: 'Campo personalizado desactivado (status = 0)' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
