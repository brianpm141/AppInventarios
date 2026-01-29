const express = require('express');
const router = express.Router();
const db = require('../db'); // conexión a tu BD

router.get('/', async (req, res) => {
  const q = req.query.q?.toLowerCase();

  if (!q) return res.status(400).json({ error: 'Query vacía' });

  try {
    const results = {};
    const like = `%${q}%`;

    const consultas = {
      devices: {
        sql: `
          SELECT DISTINCT d.id, d.brand, d.model, d.serial_number, c.name AS category, d.func
          FROM devices d
          JOIN categories c ON d.category_id = c.id
          LEFT JOIN device_custom_values dcv ON d.id = dcv.device_id
          LEFT JOIN custom_fields cf ON dcv.custom_field_id = cf.id
          WHERE d.status = 1 AND (
            d.brand LIKE ? OR
            d.model LIKE ? OR
            d.serial_number LIKE ? OR
            c.name LIKE ? OR
            dcv.value LIKE ?
          )
        `,
        params: [like, like, like, like, like]
      },
      categories: {
        sql: `SELECT id, name, description FROM categories 
              WHERE status = 1 AND name LIKE ?`,
        params: [like]
      },
      departments: {
        sql: `SELECT id, name, abbreviation FROM departments 
              WHERE status = 1 AND name LIKE ?`,
        params: [like]
      },
      floors: {
        sql: `SELECT id, name, description FROM floors 
              WHERE status = 1 AND name LIKE ?`,
        params: [like]
      },
      areas: {
        sql: `SELECT id, name, description FROM areas 
              WHERE status = 1 AND name LIKE ?`,
        params: [like]
      },
      accessories: {
  sql: `
    SELECT a.id, a.brand, a.product_name, a.total, c.name AS category
    FROM accessories a
    JOIN categories c ON a.category_id = c.id
    WHERE a.status = 1 AND (
      a.brand LIKE ? OR
      a.product_name LIKE ? OR
      c.name LIKE ?
    )
  `,
  params: [like, like, like]
},
    };

    for (const [key, { sql, params }] of Object.entries(consultas)) {
      const [rows] = await db.execute(sql, params);
      results[key] = rows;
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno en la búsqueda' });
  }
});

module.exports = router;
