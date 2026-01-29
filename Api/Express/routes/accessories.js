// Api/Express/routes/accessories.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const registrarMovimiento = require('../utils/movimientos');
const ExcelJS = require('exceljs');

// ================== Helpers ==================
async function getAccessoriesByCategoryIds(categoryIds = []) {
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) return [];
  const placeholders = categoryIds.map(() => '?').join(',');

  const [rows] = await pool.query(
    `
    SELECT
      a.id,
      a.brand,
      a.product_name,
      a.total,
      a.category_id,
      a.status,
      IFNULL(a.details, 'Sin observaciones') AS details,
      c.name AS category_name
    FROM accessories a
    JOIN categories c ON a.category_id = c.id
    WHERE a.status = 1
      AND c.type = 1
      AND a.category_id IN (${placeholders})
    ORDER BY c.name ASC, a.brand ASC, a.product_name ASC
    `,
    categoryIds
  );
  return rows;
}

// ================== Obtener todos los accesorios activos ==================
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        a.id, a.brand, a.product_name, a.total, a.category_id, a.status,
        IFNULL(a.details, 'Sin observaciones') AS details,
        c.name AS category_name
      FROM accessories a
      JOIN categories c ON a.category_id = c.id
      WHERE a.status = 1 AND c.type = 1
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener accesorios', details: err.message });
  }
});

// ================== Verificar nombre duplicado ==================
router.get('/check-name/:name', async (req, res) => {
  const { name } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT id FROM accessories WHERE product_name = ? AND status = 1 LIMIT 1',
      [name]
    );
    res.json(rows.length > 0);
  } catch (error) {
    res.status(500).json({ error: 'Error al verificar el nombre del accesorio' });
  }
});

// ================== Crear accesorio ==================
router.post('/', async (req, res) => {
  const { brand, product_name, total, category_id, details = '' } = req.body;
  const userId = req.user?.id || 1;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `
      INSERT INTO accessories (brand, product_name, total, category_id, details)
      VALUES (?, ?, ?, ?, ?)
      `,
      [brand, product_name, total, category_id, details]
    );

    await registrarMovimiento({
      table: 'accessories',
      type: 1, // creación
      objectId: result.insertId,
      userId,
      before: null,
      after: { brand, product_name, total, category_id, details }
    });

    await conn.commit();
    res.status(201).json({ id: result.insertId, message: 'Accesorio creado exitosamente' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Error al crear accesorio', details: err.message });
  } finally {
    conn.release();
  }
});

// ================== Actualizar accesorio ==================
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { brand, product_name, total, category_id, details = '' } = req.body;
  const userId = req.user?.id || 1;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [prev] = await conn.query(`SELECT * FROM accessories WHERE id = ?`, [id]);
    if (!prev.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Accesorio no encontrado' });
    }

    await conn.query(
      `
      UPDATE accessories
      SET brand = ?, product_name = ?, total = ?, category_id = ?, details = ?
      WHERE id = ?
      `,
      [brand, product_name, total, category_id, details, id]
    );

    const before = prev[0];
    const after = { brand, product_name, total, category_id, details };

    let tipo = 2; // edición general
    if (
      before.total !== undefined &&
      after.total !== undefined &&
      before.brand === after.brand &&
      before.product_name === after.product_name &&
      before.category_id === after.category_id &&
      before.details === after.details
    ) {
      tipo = after.total > before.total ? 4 : 5; // incremento o decremento de stock
    }

    await registrarMovimiento({
      table: 'accessories',
      type: tipo,
      objectId: parseInt(id, 10),
      userId,
      before,
      after
    });

    await conn.commit();
    res.json({ message: 'Accesorio actualizado correctamente' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Error al actualizar accesorio', details: err.message });
  } finally {
    conn.release();
  }
});

// ================== Eliminación lógica ==================
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || 1;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [prev] = await conn.query(`SELECT * FROM accessories WHERE id = ?`, [id]);
    if (!prev.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Accesorio no encontrado' });
    }

    await conn.query(`UPDATE accessories SET status = 0 WHERE id = ?`, [id]);

    await registrarMovimiento({
      table: 'accessories',
      type: 3, // eliminación
      objectId: parseInt(id, 10),
      userId,
      before: prev[0],
      after: null
    });

    await conn.commit();
    res.json({ message: 'Accesorio eliminado (status = 0)' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Error al eliminar accesorio', details: err.message });
  } finally {
    conn.release();
  }
});

// ================== Exportaciones ==================

// CSV: POST /export/csv  { category_ids: number[] }
router.post('/export/csv', async (req, res) => {
  try {
    const { category_ids } = req.body || {};
    if (!Array.isArray(category_ids) || category_ids.length === 0) {
      return res.status(400).json({ message: 'category_ids requerido (array con al menos un id)' });
    }

    const data = await getAccessoriesByCategoryIds(category_ids);

    const headers = ['Marca', 'Producto', 'Categoría', 'Total', 'Detalles'];
    const lines = [headers.join(',')];

    for (const r of data) {
      const cells = [
        r.brand,
        r.product_name,
        r.category_name,
        String(r.total ?? 0),
        r.details ?? ''
      ].map(v => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      });
      lines.push(cells.join(','));
    }

    // BOM para mejor compatibilidad con Excel
    const csv = '\uFEFF' + lines.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="accesorios.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    return res.status(500).json({ message: 'Error al exportar CSV', details: err.message });
  }
});

// Excel: POST /export/excel { category_ids: number[] }
router.post('/export/excel', async (req, res) => {
  try {
    const { category_ids } = req.body || {};
    if (!Array.isArray(category_ids) || category_ids.length === 0) {
      return res.status(400).json({ message: 'category_ids requerido (array con al menos un id)' });
    }

    const data = await getAccessoriesByCategoryIds(category_ids);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Accesorios');

    ws.columns = [
      { header: 'Marca', key: 'brand', width: 22 },
      { header: 'Producto', key: 'product_name', width: 32 },
      { header: 'Categoría', key: 'category_name', width: 22 },
      { header: 'Total', key: 'total', width: 10 },
      { header: 'Detalles', key: 'details', width: 40 }
    ];

    // Encabezado en negritas y centrado
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Datos
    data.forEach(r => {
      ws.addRow({
        brand: r.brand,
        product_name: r.product_name,
        category_name: r.category_name,
        total: Number(r.total ?? 0),
        details: r.details ?? ''
      });
    });

    // Fila de totales (suma de la columna Total)
    if (ws.rowCount >= 2) {
      const lastDataRow = ws.rowCount;
      const totalRow = ws.addRow(['Totales', '', '', { formula: `SUM(D2:D${lastDataRow})` }, '']);
      totalRow.font = { bold: true };
      totalRow.getCell(1).alignment = { horizontal: 'right' };
    }

    // Ajuste simple: permitir salto de línea en Detalles
    ws.getColumn(5).alignment = { wrapText: true };

    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="accesorios.xlsx"`);
    return res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    return res.status(500).json({ message: 'Error al exportar Excel', details: err.message });
  }
});

module.exports = router;
