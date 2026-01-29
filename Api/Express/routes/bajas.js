// Api/Express/routes/bajas.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const registrarMovimiento = require('../utils/movimientos');
const PDFDocument = require('pdfkit');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// === LISTAR TODAS LAS BAJAS ===
router.get('/', async (_req, res) => {
  try {
    const [bajas] = await pool.query(`
      SELECT 
        b.*,
        d.brand, d.model, d.serial_number,
        u.username AS usuario,
        COALESCE(dept_baja.name, dept_resp.name) AS departamento
      FROM bajas b
      JOIN devices d ON b.id_device = d.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN responsiva_equipos re ON re.id_device = d.id
      LEFT JOIN responsivas r ON r.id = re.id_responsiva
      LEFT JOIN departments dept_resp ON r.id_departamento = dept_resp.id
      LEFT JOIN departments dept_baja ON b.id_departamento = dept_baja.id
      ORDER BY b.fecha DESC
    `);
    res.json(bajas);
  } catch (err) {
    console.error('[ERROR] Listando bajas:', err.message);
    res.status(500).json({ error: 'Error al obtener bajas', details: err.message });
  }
});

// === REGISTRAR BAJA + PDF ===
router.post('/', async (req, res) => {
  const { fecha, motivo, detectado_por, observaciones, id_device, id_departamento } = req.body;
  const user_id = req.user?.id || 1;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Validación: el equipo debe estar en RESGUARDO
    const [[dev]] = await conn.query(`SELECT id, func FROM devices WHERE id = ? FOR UPDATE`, [id_device]);
    if (!dev) {
      await conn.rollback();
      return res.status(404).json({ error: 'Dispositivo no encontrado' });
    }
    if (dev.func !== 'resguardo') {
      await conn.rollback();
      return res.status(409).json({ error: 'Solo se puede dar de baja equipos en RESGUARDO' });
    }

    // 2) Folio correlativo
    const [[{ maxFolio }]] = await conn.query(`
      SELECT MAX(CAST(SUBSTRING(folio, 6) AS UNSIGNED)) AS maxFolio
      FROM bajas
      WHERE folio LIKE 'BAJA-%'
      FOR UPDATE
    `);
    const folio = `BAJA-${(maxFolio || 140) + 1}`;

    // 3) Insert baja (incluye id_departamento)
    const [insert] = await conn.query(`
      INSERT INTO bajas (folio, fecha, motivo, detectado_por, observaciones, id_device, user_id, id_departamento)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [folio, fecha, motivo, detectado_por, observaciones || '', id_device, user_id, id_departamento || null]);
    const bajaId = insert.insertId;

    // 4) Actualiza estado del device
    await conn.query(`UPDATE devices SET func = 'baja' WHERE id = ?`, [id_device]);

    // 5) Movimiento
    await registrarMovimiento({
      table: 'bajas',
      type: 1,
      objectId: id_device,
      userId: user_id,
      before: null,
      after: { folio, fecha, motivo, detectado_por, observaciones, id_device, id_departamento: id_departamento || null }
    });

    // 6) Datos para PDF usando COALESCE(depto baja, depto responsiva)
    const [[datos]] = await conn.query(`
      SELECT 
        d.brand, d.model, d.serial_number,
        c.name AS category_name,
        COALESCE(dept_baja.name, dept_resp.name, 'Sin asignar') AS departamento
      FROM bajas b
      JOIN devices d           ON b.id_device = d.id
      JOIN categories c        ON d.category_id = c.id
      LEFT JOIN departments dept_baja ON b.id_departamento = dept_baja.id
      LEFT JOIN responsiva_equipos re ON re.id_device = d.id
      LEFT JOIN responsivas r         ON r.id = re.id_responsiva
      LEFT JOIN departments dept_resp  ON r.id_departamento = dept_resp.id
      WHERE b.id = ?
    `, [bajaId]);

    await conn.commit();

    // 7) Generar y enviar PDF
    const doc = new PDFDocument({ size: 'A4', margin: 0 });

    // Respuesta como archivo descargable
    res.setHeader('Content-Disposition', `attachment; filename="baja_${folio}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.on('error', (err) => {
      console.error('[ERROR] PDF baja:', err.message);
      if (!res.headersSent) res.status(500).json({ error: 'Error al generar PDF' });
    });

    const backgroundPath = path.join(__dirname, '../templates/template_baja.png');
    doc.image(backgroundPath, 0, 0, { width: 595.28, height: 841.89 });

    doc.fontSize(10);
    doc.text(fecha, 500, 125);                       // FECHA
    doc.text(folio, 150, 125);                       // REPORTE No
    doc.text(datos.category_name, 150, 150);         // NOMBRE DE EQUIPO
    doc.text(datos.departamento, 150, 175);          // DEPARTAMENTO
    doc.text(motivo, 150, 205, { width: 400 });      // MOTIVO DE BAJA
    doc.text(detectado_por || '', 150, 230, { width: 400 }); // COMO SE DETECTÓ
    doc.text(datos.brand, 90, 251);                  // MARCA
    doc.text(datos.model, 90, 266);                  // MODELO
    doc.text(datos.serial_number, 70, 280);          // SN
    doc.text(observaciones || '', 60, 330, { width: 450 }); // OBSERVACIONES

    doc.end();
  } catch (err) {
    await conn.rollback();
    console.error('[ERROR] Generando baja:', err.message);
    res.status(500).json({ error: 'Error al registrar la baja', details: err.message });
  } finally {
    conn.release();
  }
});

// === OBTENER UNA BAJA POR ID (simple) ===
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [[baja]] = await pool.query(`
      SELECT b.*, d.brand, d.model, d.serial_number
      FROM bajas b
      JOIN devices d ON b.id_device = d.id
      WHERE b.id = ?
    `, [id]);

    if (!baja) return res.status(404).json({ error: 'Baja no encontrada' });
    res.json(baja);
  } catch (err) {
    console.error('[ERROR] Obtener baja:', err.message);
    res.status(500).json({ error: 'Error al obtener la baja', details: err.message });
  }
});

// === ELIMINAR BAJA POR ID DE DISPOSITIVO (restaurar a resguardo) ===
router.delete('/por-dispositivo/:id', async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM bajas WHERE id_device = ?`, [id]);
    await conn.query(`UPDATE devices SET func = 'resguardo' WHERE id = ?`, [id]);
    await conn.commit();
    res.json({ message: 'Baja eliminada correctamente' });
  } catch (err) {
    await conn.rollback();
    console.error('[ERROR] Eliminar baja por dispositivo:', err.message);
    res.status(500).json({ error: 'Error al eliminar la baja', details: err.message });
  } finally {
    conn.release();
  }
});

// === STORAGE PARA DOCUMENTOS DE BAJAS ===
const bajasDir = path.join(__dirname, '../uploads/bajas');
if (!fs.existsSync(bajasDir)) fs.mkdirSync(bajasDir, { recursive: true });

const storageBaja = multer.diskStorage({
  destination: (_, __, cb) => cb(null, bajasDir),
  filename: (_, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^\w.\-]/g, '_');
    cb(null, `${ts}_${safe}`);
  },
});
const uploadBaja = multer({
  storage: storageBaja,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_, file, cb) => {
    if (!/\.pdf$/i.test(file.originalname)) return cb(new Error('Solo PDF'));
    cb(null, true);
  },
});

// === DETALLE ENRIQUECIDO (para modal) ===
router.get('/:id/detalle', async (req, res) => {
  const { id } = req.params;
  try {
    const [[baja]] = await pool.query(`
      SELECT 
        b.id, b.folio, b.fecha, b.motivo, b.detectado_por, b.observaciones,
        b.id_device, b.user_id,
        d.brand, d.model, d.serial_number,
        c.name AS category,
        u.username AS usuario,
        COALESCE(dept_baja.name, dept_resp.name) AS departamento
      FROM bajas b
      JOIN devices d           ON b.id_device = d.id
      JOIN categories c        ON d.category_id = c.id
      JOIN users u             ON b.user_id = u.id
      LEFT JOIN departments dept_baja ON b.id_departamento = dept_baja.id
      LEFT JOIN responsiva_equipos re ON re.id_device = d.id
      LEFT JOIN responsivas r         ON r.id = re.id_responsiva
      LEFT JOIN departments dept_resp  ON r.id_departamento = dept_resp.id
      WHERE b.id = ?
    `, [id]);

    if (!baja) return res.status(404).json({ error: 'Baja no encontrada' });

    const [docs] = await pool.query(`
      SELECT id, nombre_archivo, ruta_archivo, fecha_subida 
      FROM baja_documentos 
      WHERE id_baja = ?
      ORDER BY fecha_subida DESC
    `, [id]);

    res.json({ ...baja, documentos: docs || [] });
  } catch (err) {
    console.error('[ERROR] Detalle baja:', err.message);
    res.status(500).json({ error: 'Error al obtener detalle de la baja' });
  }
});

// === LISTAR DOCUMENTOS DE UNA BAJA ===
router.get('/:id/documentos', async (req, res) => {
  const { id } = req.params;
  try {
    const [docs] = await pool.query(`
      SELECT id, nombre_archivo, ruta_archivo, fecha_subida
      FROM baja_documentos 
      WHERE id_baja = ?
      ORDER BY fecha_subida DESC
    `, [id]);
    res.json(docs);
  } catch (err) {
    console.error('[ERROR] Documentos de baja:', err.message);
    res.status(500).json({ error: 'Error al consultar documentos' });
  }
});

// === SUBIR DOCUMENTO A UNA BAJA ===
router.post('/:id/documento', uploadBaja.single('archivo'), async (req, res) => {
  const { id } = req.params;
  const archivo = req.file;
  const user_id = req.user?.id || 1;

  if (!archivo) return res.status(400).json({ error: 'Archivo no recibido' });

  try {
    await pool.query(`
      INSERT INTO baja_documentos (id_baja, nombre_archivo, ruta_archivo, user_id)
      VALUES (?, ?, ?, ?)
    `, [id, archivo.originalname, archivo.filename, user_id]);

    res.json({ message: 'Documento subido correctamente' });
  } catch (err) {
    console.error('[ERROR] Subiendo documento de baja:', err.message);
    res.status(500).json({ error: 'Error al guardar documento' });
  }
});

// === ELIMINAR DOCUMENTO ESPECÍFICO ===
router.delete('/:id/documentos/:docId', async (req, res) => {
  const { id, docId } = req.params;
  try {
    const [[doc]] = await pool.query(`
      SELECT ruta_archivo FROM baja_documentos 
      WHERE id = ? AND id_baja = ?
    `, [docId, id]);

    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

    const fullPath = path.join(bajasDir, doc.ruta_archivo);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    await pool.query(`DELETE FROM baja_documentos WHERE id = ?`, [docId]);
    res.json({ message: 'Documento eliminado correctamente' });
  } catch (err) {
    console.error('[ERROR] Eliminando documento de baja:', err.message);
    res.status(500).json({ error: 'Error al eliminar documento' });
  }
});

// === DESCARGAR ARCHIVO POR NOMBRE ===
router.get('/descargar/:archivo', (req, res) => {
  const archivo = req.params.archivo;
  const full = path.join(bajasDir, archivo);
  if (!fs.existsSync(full)) return res.status(404).send('Archivo no encontrado');
  res.download(full, archivo);
});

// === GENERAR PDF POR ID DE BAJA (descarga directa) ===
router.get('/pdf/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [[baja]] = await pool.query(`
      SELECT 
        b.*, 
        d.brand, d.model, d.serial_number, 
        c.name AS category_name,
        COALESCE(dept_baja.name, dept_resp.name, 'Sin asignar') AS departamento
      FROM bajas b
      JOIN devices d           ON b.id_device = d.id
      JOIN categories c        ON d.category_id = c.id
      LEFT JOIN departments dept_baja ON b.id_departamento = dept_baja.id
      LEFT JOIN responsiva_equipos re ON re.id_device = d.id
      LEFT JOIN responsivas r         ON r.id = re.id_responsiva
      LEFT JOIN departments dept_resp  ON r.id_departamento = dept_resp.id
      WHERE b.id = ?
    `, [id]);

    if (!baja) return res.status(404).json({ error: 'Baja no encontrada' });

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    res.setHeader('Content-Disposition', `attachment; filename="baja_${baja.folio}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    const backgroundPath = path.join(__dirname, '../templates/template_baja.png');
    doc.image(backgroundPath, 0, 0, { width: 595.28, height: 841.89 });

    doc.fontSize(10);
    const fechaTxt = (baja.fecha instanceof Date ? baja.fecha : new Date(baja.fecha)).toISOString().split('T')[0];
    doc.text(fechaTxt, 500, 125);
    doc.text(baja.folio, 150, 125);
    doc.text(baja.category_name, 150, 150);
    doc.text(baja.departamento, 150, 175);
    doc.text(baja.motivo, 150, 205, { width: 400 });
    doc.text(baja.detectado_por || '', 150, 230, { width: 400 });
    doc.text(baja.brand, 90, 251);
    doc.text(baja.model, 90, 266);
    doc.text(baja.serial_number, 70, 280);
    doc.text(baja.observaciones || '', 60, 330, { width: 450 });

    doc.end();
  } catch (err) {
    console.error('[ERROR] PDF baja:', err.message);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
});

module.exports = router;
