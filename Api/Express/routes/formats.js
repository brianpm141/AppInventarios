const express = require('express');
const path = require('path');
const router = express.Router();

// Ruta para descargar formato vacío
router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../formatos', filename);

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('Error al descargar archivo:', err);
      res.status(500).send('Error al descargar el archivo');
    }
  });
});

module.exports = router;
