// Api/Express/routes/departments.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const registrarMovimiento = require('../utils/movimientos');

// --------- Helpers ----------
async function getAssignedCount(departmentId) {
  const idNum = Number(departmentId);
  if (!Number.isInteger(idNum) || idNum <= 0) return 0;

  const [[row]] = await pool.query(
    `
    SELECT COUNT(DISTINCT re.id_device) AS count
    FROM responsivas r
    JOIN responsiva_equipos re ON re.id_responsiva = r.id
    JOIN devices d ON d.id = re.id_device
    WHERE r.id_departamento = ?
      AND r.status = 1
      AND d.status = 1
      AND d.func = 'asignado'
    `,
    [idNum]
  );
  return Number(row?.count || 0);
}

// --------- GET activos ----------
router.get('/', async (_req, res) => {
  try {
    const [departments] = await pool.query(`
      SELECT id, name, abbreviation, description, department_head, status
      FROM departments
      WHERE status = 1
      ORDER BY id DESC
    `);
    res.json(departments);
  } catch (err) {
    console.error('Error al obtener departamentos:', err);
    res.status(500).json({ message: err.message });
  }
});

// --------- ENDPOINTS AUX: deben ir antes de "/:id" ----------
router.get('/:id/equipments/count', async (req, res) => {
  const idNum = Number(req.params.id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  try {
    const count = await getAssignedCount(idNum);
    res.json({ count });
  } catch (err) {
    console.error('Error count equipos por departamento:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/equipments/has', async (req, res) => {
  const idNum = Number(req.params.id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  try {
    const has = (await getAssignedCount(idNum)) > 0;
    res.json({ has });
  } catch (err) {
    console.error('Error has equipos por departamento:', err);
    res.status(500).json({ message: err.message });
  }
});

// --------- GET por ID ----------
router.get('/:id', async (req, res) => {
  const idNum = Number(req.params.id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT * FROM departments WHERE id = ? AND status = 1',
      [idNum]
    );
    if (!rows.length) return res.status(404).json({ message: 'Departamento no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener departamento:', err);
    res.status(500).json({ message: err.message });
  }
});

// --------- POST crear ----------
router.post('/', async (req, res) => {
  const { name, abbreviation, description, department_head } = req.body;
  const userId = req.user?.id || 1;

  try {
    const [result] = await pool.query(
      'INSERT INTO departments (name, `abbreviation`, description, department_head, status) VALUES (?, ?, ?, ?, 1)',
      [name, abbreviation, description, department_head]
    );

    await registrarMovimiento({
      table: 'departments',
      type: 1,
      objectId: result.insertId,
      userId,
      before: null,
      after: { name, abbreviation, description, department_head, status: 1 }
    });

    res.status(201).json({ message: 'Departamento creado exitosamente' });
  } catch (err) {
    console.error('Error al crear departamento:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      const msg = (err.sqlMessage || err.message || '').toLowerCase();
      if (msg.includes('departments.name')) {
        return res.status(409).json({ field: 'name', message: 'Ya existe un departamento con ese nombre.' });
      }
      if (msg.includes('departments.abbreviation')) {
        return res.status(409).json({ field: 'abbreviation', message: 'Ya existe un departamento con esa abreviatura.' });
      }
    }
    res.status(500).json({ message: err.message });
  }
});

// --------- PUT actualizar ----------
router.put('/:id', async (req, res) => {
  const idNum = Number(req.params.id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({ message: 'ID inválido' });
  }

  const { name, abbreviation, description, department_head } = req.body;
  const userId = req.user?.id || 1;

  try {
    const [rows] = await pool.query('SELECT * FROM departments WHERE id = ?', [idNum]);
    if (!rows.length) return res.status(404).json({ message: 'Departamento no encontrado' });

    const before = rows[0];

    await pool.query(
      'UPDATE departments SET name = ?, `abbreviation` = ?, description = ?, department_head = ? WHERE id = ?',
      [name, abbreviation, description, department_head, idNum]
    );

    await registrarMovimiento({
      table: 'departments',
      type: 2,
      objectId: idNum,
      userId,
      before,
      after: { name, abbreviation, description, department_head }
    });

    res.json({ message: 'Departamento actualizado exitosamente' });
  } catch (err) {
    console.error('Error al actualizar departamento:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      const msg = (err.sqlMessage || err.message || '').toLowerCase();
      if (msg.includes('departments.name')) {
        return res.status(409).json({ field: 'name', message: 'Ya existe un departamento con ese nombre.' });
      }
      if (msg.includes('departments.abbreviation')) {
        return res.status(409).json({ field: 'abbreviation', message: 'Ya existe un departamento con esa abreviatura.' });
      }
    }
    res.status(500).json({ message: err.message });
  }
});

// --------- DELETE lógica (con validación de equipos + transacción) ----------
router.delete('/:id', async (req, res) => {
  const idNum = Number(req.params.id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  const userId = req.user?.id || 1;

  let conn;
  try {
    const [rows] = await pool.query('SELECT * FROM departments WHERE id = ?', [idNum]);
    if (!rows.length) return res.status(404).json({ message: 'Departamento no encontrado' });

    // Guard obligatorio
    const assigned = await getAssignedCount(idNum);
    if (assigned > 0) {
      return res.status(409).json({
        code: 'DEPT_HAS_EQUIPMENTS',
        message: 'No se puede eliminar el departamento porque tiene equipos asignados.',
        count: assigned
      });
    }

    const before = rows[0];

    conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query('UPDATE departments SET status = 0 WHERE id = ?', [idNum]);

      await registrarMovimiento({
        table: 'departments',
        type: 3,
        objectId: idNum,
        userId,
        before,
        after: null
      });

      await conn.commit();
    } catch (txErr) {
      if (conn) await conn.rollback();
      throw txErr;
    } finally {
      if (conn) conn.release();
    }

    res.json({ message: 'Departamento eliminado (status=0)' });
  } catch (err) {
    console.error('Error al eliminar departamento:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
