// routes/mantenimientos.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const registrarMovimiento = require('../utils/movimientos');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

router.post('/', async (req, res) => {
  const {
    fecha,
    descripcion_falla,
    descripcion_solucion,
    user_id,
    responsiva_id,
    completo,              // 0|1 opcional, si no viene se calcula
    hardware,              // opcional (solo para cálculo)
    software,              // opcional (solo para cálculo)
    deviceStatuses = []    // [{ id, estado: 'completo'|'pendiente' }] opcional (solo para cálculo)
  } = req.body;

  if (!fecha || !user_id || !responsiva_id) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  // Determina el flag final a guardar
  let completoFlag;
  if (completo === 0 || completo === 1) {
    completoFlag = Number(completo);
  } else {
    const hw = Number(Boolean(hardware));
    const sw = Number(Boolean(software));
    const allComplete = Array.isArray(deviceStatuses) && deviceStatuses.length > 0
      ? deviceStatuses.every(d => d.estado === 'completo')
      : false;
    completoFlag = (hw === 1 && sw === 1 && allComplete) ? 1 : 0;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Folio consecutivo con bloqueo
    const [[{ maxFolio }]] = await conn.query(`
      SELECT MAX(CAST(SUBSTRING(folio, 5) AS UNSIGNED)) AS maxFolio
      FROM mantenimientos
      WHERE folio LIKE 'MAN-%'
      FOR UPDATE
    `);
    const folio = `MAN-${(maxFolio || 140) + 1}`;

    // Datos vinculados
    const [[responsiva]] = await conn.query(`
      SELECT r.responsable, d.name AS departamento
      FROM responsivas r
      JOIN departments d ON r.id_departamento = d.id
      WHERE r.id = ?
    `, [responsiva_id]);
    if (!responsiva) throw new Error(`Responsiva no encontrada con ID: ${responsiva_id}`);

    const [[usuario]] = await conn.query(`SELECT username FROM users WHERE id = ?`, [user_id]);
    if (!usuario) throw new Error(`Usuario no encontrado con ID: ${user_id}`);

    // Inserta mantenimiento (nota: SOLO columna 'completo')
    const [insert] = await conn.query(`
      INSERT INTO mantenimientos
        (fecha, descripcion_falla, descripcion_solucion, user_id, responsiva_id, folio, completo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      fecha,
      descripcion_falla || '',
      descripcion_solucion || '',
      user_id,
      responsiva_id,
      folio,
      completoFlag
    ]);

    const mantenimientoId = insert.insertId;

    // Auditoría
    await registrarMovimiento({
      table: 'mantenimientos',
      type: 1,
      objectId: mantenimientoId,
      userId: user_id,
      before: null,
      after: {
        id: mantenimientoId, folio, fecha,
        descripcion_falla: descripcion_falla || '',
        descripcion_solucion: descripcion_solucion || '',
        user_id, responsiva_id, completo: completoFlag
      }
    });

    await conn.commit();

    // PDF (igual que antes, cambiando header y leyenda)
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    res.setHeader('Content-Disposition', `attachment; filename="mantenimiento_${folio}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('X-Folio', folio);
    res.setHeader('X-Completo', String(completoFlag));
    doc.pipe(res);

    const backgroundPath = path.join(__dirname, '../templates/template_mantenimiento.png');
    if (fs.existsSync(backgroundPath)) {
      doc.image(backgroundPath, 0, 0, { width: 595.28, height: 841.89 });
    }

    doc.fontSize(10);
    doc.text(responsiva.responsable, 90, 82);
    doc.text(fecha, 400, 82);
    doc.text(responsiva.departamento, 120, 98);
    doc.text(usuario.username, 110, 113);
    doc.text(descripcion_falla || '', 110, 562, { width: 380 });
    doc.text(descripcion_solucion || '', 135, 597, { width: 380 });

    doc.end();
  } catch (error) {
    try { await conn.rollback(); } catch {}
    console.error('[ERROR] Registro/generación mantenimiento:', error);
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Conflicto de folio, intenta nuevamente.' });
    }
    res.status(500).json({ error: 'Error interno al registrar mantenimiento' });
  } finally {
    conn.release();
  }
});

module.exports = router;
