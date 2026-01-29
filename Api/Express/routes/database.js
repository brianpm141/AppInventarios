require('dotenv').config();
const express = require('express');
const mysqldump = require('mysqldump');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const pool = require('../db');
const router = express.Router();

// Directorios
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
[UPLOAD_DIR, BACKUP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer para RESTORE
const upload = multer({ dest: UPLOAD_DIR });
/**
 * GET /api/database/export - Genera backup solo con datos y lo comprime
 */
router.get('/export', async (req, res) => {
  const fechaActual = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const fileName = `BKP-${fechaActual}.sql`;
  const filePath = path.join(BACKUP_DIR, fileName);
  const compressedPath = filePath + '.gz';

  console.log('Export DB -- HOST:', process.env.DB_HOST, 'PORT:', process.env.DB_PORT);

  try {
    const conn = await pool.getConnection();
    await conn.query('SELECT 1');
    conn.release();

    await mysqldump({
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
      },
      dumpToFile: filePath,
      dump: {
        schema: false,
        data: {
          maxRowsPerInsertStatement: 100,
        }
      }
    });

    // Comprimir el archivo
    const gzip = zlib.createGzip();
    const source = fs.createReadStream(filePath);
    const destination = fs.createWriteStream(compressedPath);

    await new Promise((resolve, reject) => {
      source.pipe(gzip).pipe(destination)
        .on('finish', resolve)
        .on('error', reject);
    });

    fs.unlinkSync(filePath); // Elimina .sql sin comprimir

    // Enviar archivo como descarga
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename=${path.basename(compressedPath)}`);
    const stream = fs.createReadStream(compressedPath);
    stream.pipe(res);
    stream.on('close', () => fs.unlink(compressedPath, () => {}));
    stream.on('error', (err) => {
      console.error('Error envío backup:', err);
      fs.unlink(compressedPath, () => {});
      res.status(500).end();
    });

  } catch (err) {
    console.error('Error backup:', err);
    res.status(500).json({ error: 'Error generando backup', details: err.message });
  }
});

/**
 * POST /api/database/restore - Restaura solo datos sin alterar estructura
 */
router.post('/restore', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió archivo de backup' });
  }

  try {
    let sql = '';

    if (req.file.originalname.endsWith('.gz')) {
      // Leer y descomprimir .gz
      const compressed = fs.readFileSync(req.file.path);
      sql = zlib.gunzipSync(compressed).toString('utf8');
    } else {
      // Leer .sql normal
      sql = fs.readFileSync(req.file.path, 'utf8');
    }

    fs.unlinkSync(req.file.path); // Borrar archivo temporal

    const conn = await pool.getConnection();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');

      const [tables] = await conn.query("SHOW TABLES");
      const tableNames = tables.map((row) => Object.values(row)[0]);
      for (const table of tableNames) {
        await conn.query(`DELETE FROM \`${table}\``);
      }

      await conn.query(sql);
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      conn.release();
    }

    res.json({ message: 'Datos restaurados exitosamente (se eliminaron los datos anteriores)' });
  } catch (err) {
    console.error('Error restaurar:', err);
    res.status(500).json({ error: 'Error restaurando backup', details: err.message });
  }
});

module.exports = router;
