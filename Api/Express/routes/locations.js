const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  const { department_id } = req.query;

  try {
    const [floors] = await pool.query(`
      SELECT id, name, description, status
      FROM floors
      WHERE status = 1
    `);

    for (let piso of floors) {
      const [areas] = await pool.query(`
        SELECT id, name, description, status
        FROM areas
        WHERE id_floor = ? AND status = 1
      `, [piso.id]);

      for (let area of areas) {
        let devicesQuery = `
          SELECT 
            d.id,
            d.brand, 
            d.model, 
            d.serial_number, 
            d.category_id,
            c.name AS category,
            rs.responsable, 
            dept.name AS departamento,
            rs.folio,
            re.id_responsiva,
            u.ultimo,
            u.completo
          FROM devices d
          JOIN categories c ON d.category_id = c.id
          JOIN responsiva_equipos re ON d.id = re.id_device
          JOIN responsivas rs ON re.id_responsiva = rs.id
          JOIN departments dept ON rs.id_departamento = dept.id
          /* Subquery que devuelve el último mantenimiento por responsiva, con su 'completo' */
          LEFT JOIN (
            SELECT m1.responsiva_id,
                  m1.fecha AS ultimo,
                  m1.completo
            FROM mantenimientos m1
            JOIN (
              /* clave para último registro: fecha + id más alto (por si hay varios en la misma fecha) */
              SELECT responsiva_id,
                    MAX(CONCAT(fecha, ' ', LPAD(id,10,'0'))) AS maxk
              FROM mantenimientos
              GROUP BY responsiva_id
            ) t ON t.responsiva_id = m1.responsiva_id
              AND CONCAT(m1.fecha, ' ', LPAD(m1.id,10,'0')) = t.maxk
          ) u ON u.responsiva_id = rs.id
          WHERE rs.id_area = ?
            AND d.status = 1
        `;

        const params = [area.id];

        if (department_id && parseInt(department_id) > 0) {
          devicesQuery += ' AND rs.id_departamento = ?';
          params.push(department_id);
        }

        devicesQuery += ';';

        const [devices] = await pool.query(devicesQuery, params);
        area.devices = devices;
        area.expanded = false;
      }

      piso.areas = areas;
      piso.expanded = false;
    }

    res.json(floors);
  } catch (err) {
    console.error('Error al obtener ubicaciones:', err);
    res.status(500).json({ message: 'Error al obtener ubicaciones' });
  }
});

module.exports = router;
