const express = require('express');
const router = express.Router();
const pool = require('../db');
const PDFDocument = require('pdfkit');
const registrarMovimiento = require('../utils/movimientos');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Configuración de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/responsivas');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const nombre = `${timestamp}_${file.originalname}`;
    cb(null, nombre);
  }
});
const upload = multer({ storage });

// Obtener todas las responsivas (las vigentes primero)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.id, r.folio, r.fecha, r.responsable, 
             a.name AS area, d.name AS departamento, r.status
      FROM responsivas r
      JOIN areas a ON r.id_area = a.id
      JOIN departments d ON r.id_departamento = d.id
      ORDER BY r.status DESC, r.fecha DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al consultar responsivas:', error);
    res.status(500).json({ error: 'Error al consultar las responsivas' });
  }
});



// Obtener detalle de una responsiva
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [[responsiva]] = await pool.query(`
      SELECT r.id, r.folio, r.fecha, r.responsable, a.name AS area, d.name AS departamento
      FROM responsivas r
      JOIN areas a ON r.id_area = a.id
      JOIN departments d ON r.id_departamento = d.id
      WHERE r.id = ? AND r.status = 1
    `, [id]);

    if (!responsiva) return res.status(404).json({ error: 'Responsiva no encontrada' });

    const [dispositivos] = await pool.query(`
      SELECT dev.id, dev.brand, dev.model, dev.serial_number, c.name AS category
      FROM responsiva_equipos re
      JOIN devices dev ON re.id_device = dev.id
      JOIN categories c ON dev.category_id = c.id
      WHERE re.id_responsiva = ?
    `, [id]);

    res.json({ ...responsiva, dispositivos });

  } catch (error) {
    console.error('Error al consultar detalle de la responsiva:', error);
    res.status(500).json({ error: 'Error al consultar la responsiva' });
  }
});

// Obtener siguiente folio
async function obtenerSiguienteFolio() {
  const [[{ maxFolio }]] = await pool.query(`
    SELECT MAX(CAST(SUBSTRING(folio, 5) AS UNSIGNED)) AS maxFolio FROM responsivas 
    WHERE folio LIKE 'SIS-%'
  `);
  return `SIS-${(maxFolio || 133) + 1}`;
}

// Previsualización PDF sin guardar
router.post('/preview', async (req, res) => {
  const { responsable, id_area, id_departamento, dispositivos = [] } = req.body;
  try {
    if (!responsable || !id_area || !id_departamento || dispositivos.length === 0) {
      return res.status(400).json({ error: 'Datos incompletos para previsualización' });
    }

    const folio = await obtenerSiguienteFolio();
    const fechaActual = new Date();

    const [[departamento]] = await pool.query('SELECT name FROM departments WHERE id = ?', [id_departamento]);
    if (!departamento) return res.status(404).json({ error: 'Departamento no encontrado' });

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="previsualizacion_responsiva.pdf"');
    doc.pipe(res);

    const backgroundPath = path.join(__dirname, '../templates/template_responsiva.png');
    doc.image(backgroundPath, 0, 0, { width: 595.28, height: 841.89 });

    doc.fontSize(10).text(`${folio}`, 90, 107);
    doc.fontSize(10).text(`${fechaActual.toLocaleDateString()}`, 510, 135);
    doc.fontSize(10).text(`${responsable}`, 90, 163);
    doc.fontSize(10).text(`${departamento.name}`, 380, 163);

    const startX = 50;
    let y = 350;
    const rowHeight = 12;

    doc.rect(startX, y, 20, rowHeight).stroke().text('NO', startX + 5, y + 2);
    doc.rect(startX + 20, y, 80, rowHeight).stroke().text('Equipo', startX + 25, y + 2);
    doc.rect(startX + 100, y, 100, rowHeight).stroke().text('Marca', startX + 105, y + 2);
    doc.rect(startX + 200, y, 100, rowHeight).stroke().text('Modelo', startX + 205, y + 2);
    doc.rect(startX + 300, y, 200, rowHeight).stroke().text('No de Serie', startX + 305, y + 2);

    y += rowHeight;
    dispositivos.forEach((d, i) => {
      doc.rect(startX, y, 20, rowHeight).stroke().text(`${i + 1}`, startX + 5, y + 2);
      doc.rect(startX + 20, y, 80, rowHeight).stroke().text(d.category, startX + 25, y + 2);
      doc.rect(startX + 100, y, 100, rowHeight).stroke().text(d.brand, startX + 105, y + 2);
      doc.rect(startX + 200, y, 100, rowHeight).stroke().text(d.model, startX + 205, y + 2);
      doc.rect(startX + 300, y, 200, rowHeight).stroke().text(d.serial_number, startX + 305, y + 2);
      y += rowHeight;
    });

    doc.end();

  } catch (error) {
    console.error('Error en previsualización:', error);
    res.status(500).json({ error: 'Error al generar la previsualización' });
  }
});

// Crear una responsiva
router.post('/', async (req, res) => {
  const { responsable, id_area, id_departamento, user_id, dispositivos } = req.body;
  if (!responsable || !id_area || !id_departamento || !user_id || !dispositivos?.length) {
    return res.status(400).json({ error: 'Datos incompletos para guardar responsiva' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const folio = await obtenerSiguienteFolio();
    const fechaActual = new Date().toISOString().slice(0, 10);

    const [result] = await conn.query(`
      INSERT INTO responsivas (folio, fecha, responsable, id_area, id_departamento, user_id, status)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [folio, fechaActual, responsable, id_area, id_departamento, user_id]);

    const responsivaId = result.insertId;

    for (const id_device of dispositivos) {
      await conn.query(
        `INSERT INTO responsiva_equipos (id_responsiva, id_device) VALUES (?, ?)`,
        [responsivaId, id_device]
      );

      // 🔽 aquí marcamos el equipo como asignado y usado
      await conn.query(
        `UPDATE devices 
           SET func = 'asignado', is_new = 0
         WHERE id = ?
           AND func <> 'baja'`,
        [id_device]
      );
    }

    await registrarMovimiento({
      table: 'responsivas',
      type: 1,
      objectId: responsivaId,
      userId: user_id,
      before: null,
      after: { folio, fecha: fechaActual, responsable, id_area, id_departamento, user_id, dispositivos }
    });

    await conn.commit();
    res.status(201).json({ message: 'Responsiva creada correctamente', id: responsivaId, folio });
  } catch (error) {
    await conn.rollback();
    console.error('Error al crear la responsiva:', error);
    res.status(500).json({ error: 'Error al crear la responsiva' });
  } finally {
    conn.release();
  }
});


// Descargar PDF de una responsiva existente
router.get('/pdf/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [[responsiva]] = await pool.query(`
      SELECT r.folio, r.fecha, r.responsable, d.name AS departamento
      FROM responsivas r
      JOIN departments d ON r.id_departamento = d.id
      WHERE r.id = ?
    `, [id]);

    if (!responsiva) return res.status(404).json({ error: 'Responsiva no encontrada' });

    const [equipos] = await pool.query(`
      SELECT dev.brand, dev.model, dev.serial_number, c.name AS category
      FROM responsiva_equipos re
      JOIN devices dev ON re.id_device = dev.id
      JOIN categories c ON dev.category_id = c.id
      WHERE re.id_responsiva = ?
    `, [id]);

    generarPDF(res, responsiva, equipos);

  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ error: 'Error al generar el PDF' });
  }
});

function generarPDF(res, responsiva, equipos) {
  const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
  res.setHeader('Content-Disposition', `attachment; filename="RES_${responsiva.folio}.pdf"`);
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  const backgroundPath = path.join(__dirname, '../templates/template_responsiva.png');
  doc.image(backgroundPath, 0, 0, { width: 612, height: 792 });

  doc.fontSize(10).text(`${responsiva.folio}`, 92, 100);
  doc.fontSize(9).text(`${responsiva.fecha.toISOString().split('T')[0]}`, 525, 127);
  doc.fontSize(10);
  doc.text(`${responsiva.responsable}`, 90, 155);
  doc.text(`${responsiva.departamento}`, 385, 155);

  // Configuración de tabla
  const startX = 50;
  let y = 350;
  const colWidths = [20, 80, 100, 100, 200];
  const headers = ['NO', 'Equipo', 'Marca', 'Modelo', 'No de Serie'];

  // Encabezados
  headers.forEach((h, i) => {
    doc.rect(startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, colWidths[i], 20).stroke();
    doc.text(h, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 2, y + 5, {
      width: colWidths[i] - 4,
      align: 'center'
    });
  });

  y += 20;

  // Filas de datos con ajuste dinámico
  equipos.forEach((e, idx) => {
    const values = [
      `${idx + 1}`,
      e.category || '',
      e.brand || '',
      e.model || '',
      e.serial_number || ''
    ];

    // Calcular altura necesaria según el texto más alto de la fila
    let rowHeight = 0;
    const cellHeights = values.map((val, i) => {
      const textHeight = doc.heightOfString(val, { width: colWidths[i] - 4, align: 'left' });
      return textHeight + 6; // margen
    });
    rowHeight = Math.max(...cellHeights);

    // Dibujar celdas y texto
    values.forEach((val, i) => {
      const cellX = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.rect(cellX, y, colWidths[i], rowHeight).stroke();
      doc.text(val, cellX + 2, y + 3, {
        width: colWidths[i] - 4,
        align: i === 0 ? 'center' : 'left'
      });
    });

    y += rowHeight;
  });

  doc.end();
}


// Cancelar una responsiva y liberar dispositivos
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || 1;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[responsiva]] = await conn.query('SELECT * FROM responsivas WHERE id = ? AND status = 1', [id]);
    if (!responsiva) {
      await conn.rollback();
      return res.status(404).json({ error: 'Responsiva no encontrada o ya cancelada' });
    }

    const [dispositivos] = await conn.query('SELECT id_device FROM responsiva_equipos WHERE id_responsiva = ?', [id]);

    for (const { id_device } of dispositivos) {
      await conn.query(`UPDATE devices SET func = 'resguardo' WHERE id = ? AND func = 'asignado'`, [id_device]);
    }

    await conn.query(`UPDATE responsivas SET status = 0 WHERE id = ?`, [id]);

    await registrarMovimiento({
      table: 'responsivas',
      type: 3,
      objectId: parseInt(id),
      userId,
      before: responsiva,
      after: null
    });

    await conn.commit();
    res.json({ message: 'Responsiva cancelada correctamente' });

  } catch (error) {
    await conn.rollback();
    console.error('Error al cancelar la responsiva:', error);
    res.status(500).json({ error: 'Error al cancelar la responsiva' });
  } finally {
    conn.release();
  }
});

router.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || 1;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[responsiva]] = await conn.query('SELECT * FROM responsivas WHERE id = ?', [id]);
    if (!responsiva) {
      await conn.rollback();
      return res.status(404).json({ error: 'Responsiva no encontrada' });
    }

    // Regresar dispositivos a resguardo
    const [dispositivos] = await conn.query('SELECT id_device FROM responsiva_equipos WHERE id_responsiva = ?', [id]);
    for (const { id_device } of dispositivos) {
      await conn.query(`UPDATE devices SET func = 'resguardo' WHERE id = ?`, [id_device]);
    }

    // Eliminar relaciones y la responsiva
    await conn.query('DELETE FROM responsiva_equipos WHERE id_responsiva = ?', [id]);
    await conn.query('DELETE FROM responsivas WHERE id = ?', [id]);

    await registrarMovimiento({
      table: 'responsivas',
      type: 4, // tipo 4 = eliminación definitiva
      objectId: parseInt(id),
      userId,
      before: responsiva,
      after: null
    });

    await conn.commit();
    res.json({ message: 'Responsiva eliminada definitivamente y dispositivos liberados' });
  } catch (error) {
    await conn.rollback();
    console.error('[ERROR] Al eliminar responsiva:', error.message);
    res.status(500).json({ error: 'Error al eliminar la responsiva' });
  } finally {
    conn.release();
  }
});


// POST: Subir documento para una responsiva
router.post('/:id/documento', upload.single('archivo'), async (req, res) => {
  const { id } = req.params;
  const archivo = req.file;
  const user_id = req.user?.id || 1;

  if (!archivo) return res.status(400).json({ error: 'Archivo no recibido' });

  try {
await pool.query(`
      INSERT INTO responsiva_documentos (id_responsiva, nombre_archivo, ruta_archivo, user_id)
      VALUES (?, ?, ?, ?)
    `, [id, archivo.originalname, archivo.filename, user_id]);

    res.json({ message: 'Archivo guardado correctamente' });
  } catch (error) {
    console.error('[ERROR] Subiendo documento:', error.message);
    res.status(500).json({ error: 'Error al guardar documento' });
  }
});

// GET: Obtener documentos de una responsiva
router.get('/:id/documentos', async (req, res) => {
  const { id } = req.params;

  try {
    const [docs] = await pool.query(`
      SELECT id, nombre_archivo, ruta_archivo, fecha_subida 
      FROM responsiva_documentos 
      WHERE id_responsiva = ?
    `, [id]);

    res.json(docs);
  } catch (error) {
    console.error('[ERROR] Consultando documentos:', error.message);
    res.status(500).json({ error: 'Error al consultar documentos' });
  }
});

router.get('/descargar/:archivo', (req, res) => {
  const archivo = req.params.archivo;
  const rutaCompleta = path.join(__dirname, '../uploads/responsivas', archivo);

  if (!fs.existsSync(rutaCompleta)) {
    return res.status(404).send('Archivo no encontrado');
  }

  res.download(rutaCompleta, archivo); // <- fuerza la descarga
});

// DELETE: Eliminar documento específico
router.delete('/:id/documentos/:docId', async (req, res) => {
  const { id, docId } = req.params;

  try {
    // Obtener la ruta del archivo a eliminar
    const [[doc]] = await pool.query(`
      SELECT ruta_archivo FROM responsiva_documentos 
      WHERE id = ? AND id_responsiva = ?
    `, [docId, id]);

    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

    const rutaCompleta = path.join(__dirname, '../uploads/responsivas', doc.ruta_archivo);
    if (fs.existsSync(rutaCompleta)) fs.unlinkSync(rutaCompleta); // eliminar archivo

    // Eliminar registro de la base de datos
    await pool.query('DELETE FROM responsiva_documentos WHERE id = ?', [docId]);

    res.json({ message: 'Documento eliminado correctamente' });
  } catch (error) {
    console.error('[ERROR] Eliminando documento:', error.message);
    res.status(500).json({ error: 'Error al eliminar documento' });
  }
});


module.exports = router;
