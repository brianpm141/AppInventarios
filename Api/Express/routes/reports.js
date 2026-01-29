// routes/reports.js
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const express = require('express');
const router = express.Router();
const db = require('../db');

/* =================== DEVICES =================== */

// Resumen general de dispositivos
router.get('/devices-summary', async (req, res) => {
  try {
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM devices`);
    const [[{ asignado }]] = await db.query(`SELECT COUNT(*) AS asignado FROM devices WHERE func = 'asignado'`);
    const [[{ resguardo }]] = await db.query(`SELECT COUNT(*) AS resguardo FROM devices WHERE func = 'resguardo'`);
    const [[{ baja }]] = await db.query(`SELECT COUNT(*) AS baja FROM devices WHERE func = 'baja'`);
    const [[{ nuevos }]] = await db.query(`SELECT COUNT(*) AS nuevos FROM devices WHERE is_new = 1`);
    const [[{ usados }]] = await db.query(`SELECT COUNT(*) AS usados FROM devices WHERE is_new = 0`);

    // Solo categorías type=0 (de dispositivos)
    const [categories] = await db.query(`
      SELECT c.id, c.name, COUNT(d.id) AS total
      FROM categories c
      LEFT JOIN devices d ON d.category_id = c.id
      WHERE c.type = 0
      GROUP BY c.id, c.name
      ORDER BY c.name
    `);

    res.json({ totalDevices: total, asignado, resguardo, baja, nuevos, usados, categories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener el resumen' });
  }
});

// Listado filtrado de dispositivos
router.post('/devices-list', async (req, res) => {
  try {
    const { categories = [], status, is_new, func } = req.body;
    let query = `
      SELECT d.id, d.brand, d.model, d.serial_number,
             c.name AS category, d.func, d.is_new
      FROM devices d
      JOIN categories c ON d.category_id = c.id AND c.type = 0
    `;
    const conditions = [];
    const params = [];

    if (Array.isArray(categories) && categories.length > 0) {
      conditions.push(`d.category_id IN (${categories.map(() => '?').join(',')})`);
      params.push(...categories);
    }
    if (status !== undefined) {
      conditions.push(`d.status = ?`);
      params.push(status);
    }
    if (is_new !== undefined && is_new !== null) {
      conditions.push(`d.is_new = ?`);
      params.push(is_new);
    }
    if (func !== undefined && func !== null && func !== '') {
      conditions.push(`d.func = ?`);
      params.push(func);
    }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');

    const [devices] = await db.query(query, params);
    res.json({ devices });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener la lista' });
  }
});

// Exportar CSV de dispositivos
router.post('/devices-export/csv', async (req, res) => {
  try {
    const { categories = [], status, is_new, func } = req.body;
    let query = `
      SELECT d.brand, d.model, d.serial_number,
             c.name AS category, d.func, d.is_new
      FROM devices d
      JOIN categories c ON d.category_id = c.id AND c.type = 0
    `;
    const conditions = [];
    const params = [];

    if (Array.isArray(categories) && categories.length > 0) {
      conditions.push(`d.category_id IN (${categories.map(() => '?').join(',')})`);
      params.push(...categories);
    }
    if (status !== undefined) { conditions.push(`d.status = ?`); params.push(status); }
    if (is_new !== undefined && is_new !== null) { conditions.push(`d.is_new = ?`); params.push(is_new); }
    if (func !== undefined && func !== null && func !== '') { conditions.push(`d.func = ?`); params.push(func); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');

    const [devices] = await db.query(query, params);

    // Mapeo para export
    const rows = devices.map(d => ({
      'Marca': d.brand,
      'Modelo': d.model,
      'Número de serie': d.serial_number,
      'Categoría': d.category,
      'Estatus': d.func ? d.func.charAt(0).toUpperCase() + d.func.slice(1) : '',
      '¿Nuevo?': Number(d.is_new) === 1 ? 'Nuevo' : 'Usado'
    }));

    const headers = Object.keys(rows[0] || {
      'Marca': '', 'Modelo': '', 'Número de serie': '', 'Categoría': '', 'Estatus': '', '¿Nuevo?': ''
    });

    const esc = (v) => {
      const s = (v ?? '').toString();
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = [headers.join(',')];
    rows.forEach(r => lines.push(headers.map(h => esc(r[h])).join(',')));

    // Totales
    const totalRegistros = devices.length;
    const totAsignado = devices.filter(d => d.func === 'asignado').length;
    const totResguardo = devices.filter(d => d.func === 'resguardo').length;
    const totBaja = devices.filter(d => d.func === 'baja').length;
    const totNuevo = devices.filter(d => Number(d.is_new) === 1).length;
    const totUsado = devices.filter(d => Number(d.is_new) === 0).length;

    lines.push([ '', '', '', 'Totales por estatus', 'Asignado', totAsignado ].join(','));
    lines.push([ '', '', '', '', 'Resguardo', totResguardo ].join(','));
    lines.push([ '', '', '', '', 'Baja', totBaja ].join(','));
    lines.push([ '', '', '', 'Totales por condición', 'Nuevo', totNuevo ].join(','));
    lines.push([ '', '', '', '', 'Usado', totUsado ].join(','));
    lines.push([ '', '', '', 'Registros totales', '', totalRegistros ].join(','));

    const csv = '\uFEFF' + lines.join('\n'); // BOM para Excel
    const fecha = new Date().toISOString().split('T')[0];

    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(`equipos_${fecha}.csv`);
    return res.send(csv);
  } catch (error) {
    console.error('Error al exportar CSV:', error);
    res.status(500).json({ message: 'Error al exportar CSV' });
  }
});

// Exportar Excel de dispositivos
router.post('/devices-export/excel', async (req, res) => {
  try {
    const { categories = [], status, is_new, func } = req.body;
    let query = `
      SELECT d.brand, d.model, d.serial_number,
             c.name AS category, d.func, d.is_new
      FROM devices d
      JOIN categories c ON d.category_id = c.id AND c.type = 0
    `;
    const conditions = [];
    const params = [];

    if (Array.isArray(categories) && categories.length > 0) {
      conditions.push(`d.category_id IN (${categories.map(() => '?').join(',')})`);
      params.push(...categories);
    }
    if (status !== undefined) { conditions.push(`d.status = ?`); params.push(status); }
    if (is_new !== undefined && is_new !== null) { conditions.push(`d.is_new = ?`); params.push(is_new); }
    if (func !== undefined && func !== null && func !== '') { conditions.push(`d.func = ?`); params.push(func); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');

    const [devices] = await db.query(query, params);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Equipos');

    ws.columns = [
      { header: 'Marca', key: 'brand', width: 20 },
      { header: 'Modelo', key: 'model', width: 20 },
      { header: 'Número de serie', key: 'serial_number', width: 28 },
      { header: 'Categoría', key: 'category', width: 20 },
      { header: 'Estatus', key: 'estatus', width: 14 },
      { header: '¿Nuevo?', key: 'nuevo', width: 12 }
    ];

    devices.forEach(d => {
      ws.addRow({
        brand: d.brand,
        model: d.model,
        serial_number: d.serial_number,
        category: d.category,
        estatus: d.func ? d.func.charAt(0).toUpperCase() + d.func.slice(1) : '',
        nuevo: Number(d.is_new) === 1 ? 'Nuevo' : 'Usado'
      });
    });

    // Totales
    const totalRegistros = devices.length;
    const totAsignado = devices.filter(d => d.func === 'asignado').length;
    const totResguardo = devices.filter(d => d.func === 'resguardo').length;
    const totBaja = devices.filter(d => d.func === 'baja').length;
    const totNuevo = devices.filter(d => Number(d.is_new) === 1).length;
    const totUsado = devices.filter(d => Number(d.is_new) === 0).length;

    ws.addRow({});
    const r1 = ws.addRow({ category: 'Totales por estatus', estatus: 'Asignado', nuevo: totAsignado });
    const r2 = ws.addRow({ estatus: 'Resguardo', nuevo: totResguardo });
    const r3 = ws.addRow({ estatus: 'Baja', nuevo: totBaja });
    ws.addRow({});
    const r4 = ws.addRow({ category: 'Totales por condición', estatus: 'Nuevo', nuevo: totNuevo });
    const r5 = ws.addRow({ estatus: 'Usado', nuevo: totUsado });
    ws.addRow({});
    const r6 = ws.addRow({ category: 'Registros totales', nuevo: totalRegistros });
    [r1, r2, r3, r4, r5, r6].forEach(r => { r.font = { bold: true }; });

    ws.getRow(1).font = { bold: true };
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 6 } };

    const fecha = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="equipos_${fecha}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error al exportar Excel:', error);
    res.status(500).json({ message: 'Error al exportar Excel' });
  }
});

/* =================== ACCESSORIES =================== */

// Resumen de accesorios
router.get('/accessories-summary', async (req, res) => {
  try {
    const [[{ total }]] = await db.query(`SELECT SUM(total) AS total FROM accessories WHERE status = 1`);
    const [categorias] = await db.query(`
      SELECT c.id, c.name, SUM(a.total) AS total
      FROM categories c
      JOIN accessories a ON a.category_id = c.id
      WHERE a.status = 1
      GROUP BY c.id, c.name
    `);
    const ordenadas = categorias.sort((a, b) => (b.total || 0) - (a.total || 0));
    const categoria_mayor = ordenadas[0]?.name || 'N/A';
    const categoria_menor = ordenadas[ordenadas.length - 1]?.name || 'N/A';

    res.json({ total, categorias, categoria_mayor, categoria_menor });
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    res.status(500).json({ message: 'Error al obtener resumen' });
  }
});

// Listado de accesorios (filtrado)
router.post('/accessories-list', async (req, res) => {
  try {
    const { categories = [] } = req.body;
    let query = `
      SELECT a.brand, a.product_name, a.total, c.name AS category
      FROM accessories a
      JOIN categories c ON a.category_id = c.id
      WHERE a.status = 1
    `;
    const params = [];

    if (Array.isArray(categories) && categories.length > 0) {
      query += ` AND a.category_id IN (${categories.map(() => '?').join(',')})`;
      params.push(...categories);
    }

    const [accessories] = await db.query(query, params);
    res.json({ accessories });
  } catch (error) {
    console.error('Error al obtener listado:', error);
    res.status(500).json({ message: 'Error al obtener el listado' });
  }
});

// Exportar CSV de accesorios
router.post('/accessories-export/csv', async (req, res) => {
  try {
    const { categories = [] } = req.body;
    let query = `
      SELECT a.brand, a.product_name, a.total, c.name AS category
      FROM accessories a
      JOIN categories c ON a.category_id = c.id
      WHERE a.status = 1
    `;
    const params = [];

    if (Array.isArray(categories) && categories.length > 0) {
      query += ` AND a.category_id IN (${categories.map(() => '?').join(',')})`;
      params.push(...categories);
    }

    const [rows] = await db.query(query, params);

    const headers = ['Marca', 'Producto', 'Categoría', 'Total'];
    const esc = (v) => {
      const s = (v ?? '').toString();
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = [headers.join(',')];
    let sumTotal = 0;

    rows.forEach(r => {
      const total = Number(r.total) || 0;
      sumTotal += total;
      lines.push([ esc(r.brand), esc(r.product_name), esc(r.category), total ].join(','));
    });

    // Fila de totales
    lines.push([ '', '', 'Totales', sumTotal ].join(','));

    const csv = '\uFEFF' + lines.join('\n'); // BOM
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment('accesorios.csv');
    return res.send(csv);
  } catch (error) {
    console.error('Error al exportar CSV:', error);
    res.status(500).json({ message: 'Error al exportar CSV' });
  }
});

// Exportar Excel de accesorios
router.post('/accessories-export/excel', async (req, res) => {
  try {
    const { categories = [] } = req.body;
    let query = `
      SELECT a.brand, a.product_name, a.total, c.name AS category
      FROM accessories a
      JOIN categories c ON a.category_id = c.id
      WHERE a.status = 1
    `;
    const params = [];

    if (Array.isArray(categories) && categories.length > 0) {
      query += ` AND a.category_id IN (${categories.map(() => '?').join(',')})`;
      params.push(...categories);
    }

    const [rows] = await db.query(query, params);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Accesorios');

    worksheet.columns = [
      { header: 'Marca', key: 'brand', width: 20 },
      { header: 'Producto', key: 'product_name', width: 28 },
      { header: 'Categoría', key: 'category', width: 20 },
      { header: 'Total', key: 'total', width: 10 }
    ];

    rows.forEach(r => worksheet.addRow({
      brand: r.brand,
      product_name: r.product_name,
      category: r.category,
      total: Number(r.total) || 0
    }));

    const sumTotal = rows.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
    const totalRow = worksheet.addRow({ brand: '', product_name: '', category: 'Totales', total: sumTotal });
    totalRow.font = { bold: true };
    totalRow.alignment = { horizontal: 'right' };

    worksheet.getRow(1).font = { bold: true };
    worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 4 } };

    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition','attachment; filename="accesorios.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error al exportar Excel:', error);
    res.status(500).json({ message: 'Error al exportar Excel' });
  }
});

// Obtener todos los accesorios activos
router.get('/all-accessories', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.brand, a.product_name, a.total, c.name AS category
      FROM accessories a
      JOIN categories c ON a.category_id = c.id
      WHERE a.status = 1
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener todos los accesorios:', error);
    res.status(500).json({ message: 'Error al obtener accesorios' });
  }
});

module.exports = router;
