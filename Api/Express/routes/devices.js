const express = require('express');
const router = express.Router();
const pool = require('../db');
const registrarMovimiento = require('../utils/movimientos');

// Obtener todos los equipos activos
router.get('/', async (req, res) => {
  try {
    const [devices] = await pool.query(`
      SELECT d.*, c.name AS category_name, g.group_number 
      FROM devices d
      JOIN categories c ON d.category_id = c.id
      LEFT JOIN device_groups g ON d.group_id = g.id
      WHERE c.type = 0 AND d.status = 1
    `);
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los equipos', details: error.message });
  }
});

// Obtener un equipo por ID (con campos personalizados si aplica)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [[device]] = await pool.query(`
      SELECT d.*, c.name AS category_name, g.group_number 
      FROM devices d
      JOIN categories c ON d.category_id = c.id
      LEFT JOIN device_groups g ON d.group_id = g.id
      WHERE d.id = ? AND c.type = 0
    `, [id]);

    if (!device) return res.status(404).json({ error: 'Equipo no encontrado' });

    const [customFields] = await pool.query(`
      SELECT cf.id AS custom_field_id, cf.name, cf.data_type, dcv.value
      FROM custom_fields cf
      LEFT JOIN device_custom_values dcv
        ON dcv.custom_field_id = cf.id AND dcv.device_id = ?
      WHERE cf.category_id = ? AND cf.status = 1
    `, [id, device.category_id]);

    let ubicacion = null;
    if (device.func === 'asignado') {
      const [[data]] = await pool.query(`
        SELECT a.name AS area, f.name AS piso, d.name AS departamento, r.responsable
        FROM responsiva_equipos re
        JOIN responsivas r ON r.id = re.id_responsiva
        JOIN areas a ON r.id_area = a.id
        JOIN floors f ON a.id_floor = f.id
        JOIN departments d ON r.id_departamento = d.id
        WHERE re.id_device = ? AND r.status = 1
        ORDER BY r.fecha DESC LIMIT 1
      `, [id]);
      ubicacion = data || null;
    }


    res.json({ ...device, custom_fields: customFields, ubicacion });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener detalles del equipo' });
  }
});

// Crear un nuevo equipo
router.post('/', async (req, res) => {
  const {
    brand, model, serial_number,
    category_id, group_id = null,
    custom_values = [], details = '',
    is_new = 1
  } = req.body;

  const userId = req.user?.id || 1;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO devices (brand, model, serial_number, category_id, group_id, status, details, is_new)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [brand, model, serial_number, category_id, group_id, details, is_new]
    );
    const deviceId = result.insertId;

    for (const { custom_field_id, value } of custom_values) {
      await conn.query(
        `INSERT INTO device_custom_values (device_id, custom_field_id, value)
         VALUES (?, ?, ?)`,
        [deviceId, custom_field_id, value]
      );
    }

    await registrarMovimiento({
      table: 'devices',
      type: 1,
      objectId: deviceId,
      userId,
      before: null,
      after: { brand, model, serial_number, category_id, group_id, status: 1, details, is_new }
    });

    await conn.commit();
    res.status(201).json({ message: 'Equipo creado exitosamente', id: deviceId });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: 'Error al registrar el equipo', details: error.message });
  } finally {
    conn.release();
  }
});

// Actualizar un equipo
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    brand, model, serial_number,
    category_id, group_id, custom_values = [],
    details = '', is_new = 1
  } = req.body;

  const userId = req.user?.id || 1;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM devices WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Equipo no encontrado' });

    const before = rows[0];

    await conn.query(
      `UPDATE devices SET brand = ?, model = ?, serial_number = ?, category_id = ?, group_id = ?, details = ?, is_new = ?
       WHERE id = ?`,
      [brand, model, serial_number, category_id, group_id, details, is_new, id]
    );

    for (const { custom_field_id, value } of custom_values) {
      const [existing] = await conn.query(
        `SELECT id FROM device_custom_values WHERE device_id = ? AND custom_field_id = ?`,
        [id, custom_field_id]
      );

      if (existing.length) {
        await conn.query(
          `UPDATE device_custom_values SET value = ? WHERE device_id = ? AND custom_field_id = ?`,
          [value, id, custom_field_id]
        );
      } else {
        await conn.query(
          `INSERT INTO device_custom_values (device_id, custom_field_id, value) VALUES (?, ?, ?)`,
          [id, custom_field_id, value]
        );
      }
    }

    const [rowsAfter] = await conn.query('SELECT * FROM devices WHERE id = ?', [id]);
    const after = rowsAfter[0] || {};

    await registrarMovimiento({
      table: 'devices',
      type: 2,
      objectId: parseInt(id),
      userId,
      before,
      after
    });

    await conn.commit();
    res.json({ message: 'Equipo actualizado correctamente' });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: 'Error al actualizar equipo', details: error.message });
  } finally {
    conn.release();
  }
});

// Eliminación lógica del equipo
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || 1;
  try {
    const [rows] = await pool.query('SELECT * FROM devices WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Equipo no encontrado' });

    const before = rows[0];

    await pool.query('UPDATE devices SET status = 0 WHERE id = ?', [id]);

    await registrarMovimiento({
      table: 'devices',
      type: 3,
      objectId: parseInt(id),
      userId,
      before,
      after: null
    });

    res.json({ message: 'Equipo eliminado (status = 0)' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar equipo', details: error.message });
  }
});

// Obtener campos personalizados activos para una categoría
router.get('/custom-fields/:categoryId', async (req, res) => {
  const { categoryId } = req.params;
  try {
    const [[category]] = await pool.query('SELECT type FROM categories WHERE id = ?', [categoryId]);
    if (!category || category.type !== 0) {
      return res.status(400).json({ error: 'La categoría no es válida o no es de tipo Equipo' });
    }

    const [fields] = await pool.query(
      'SELECT * FROM custom_fields WHERE category_id = ? AND status = 1',
      [categoryId]
    );
    res.json(fields);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener campos personalizados' });
  }
});

// Obtener equipos por categoría
router.get('/category/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [devices] = await pool.query(`
      SELECT d.*, c.name AS category_name, g.group_number 
      FROM devices d
      JOIN categories c ON d.category_id = c.id
      LEFT JOIN device_groups g ON d.group_id = g.id
      WHERE c.type = 0 AND d.status = 1 AND d.category_id = ?
    `, [id]);
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: 'Error al filtrar dispositivos', details: error.message });
  }
});

// Obtener dispositivos asignados a un departamento por medio de responsivas
router.get('/por-departamento/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT d.id, d.brand, d.model, d.serial_number, c.name AS category_name
      FROM responsivas r
      JOIN responsiva_equipos re ON r.id = re.id_responsiva
      JOIN devices d ON d.id = re.id_device
      JOIN categories c ON d.category_id = c.id
      WHERE r.id_departamento = ? AND r.status = 1 AND d.status = 1
    `, [id]);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener dispositivos por departamento:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
