const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const departmentsRoutes = require('./routes/departments');
const usersRoutes = require('./routes/users');
const databaseRoutes = require('./routes/database');
const backupConfigRoutes = require('./routes/backupConfig');
const categoriesRoutes = require('./routes/categories');
const historyRoutes = require('./routes/history');
const devicesRoutes = require('./routes/devices');
const searchRoutes = require('./routes/search');
const reportsRoutes = require('./routes/reports');
const locationsRoutes = require('./routes/locations');
const responsivasRoutes = require('./routes/responsivas');
const mantenimientosRoutes = require('./routes/mantenimientos');
const bajasRoutes = require('./routes/bajas');
const formatsRoutes = require('./routes/formats');
const accessoriesRoutes = require('./routes/accessories');
const { iniciarCronAutomatico } = require('./cron/autoBackup');
const authRoutes = require('./routes/auth');
const areasRoutes = require('./routes/areas');
const floorsRoutes = require('./routes/floors');


iniciarCronAutomatico();

dotenv.config();
const app = express();
const path = require('path');

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); // para parsear JSON


app.use('/uploads/responsivas', express.static(path.join(__dirname, 'uploads/responsivas')));
app.use('/uploads/bajas', express.static(path.join(__dirname, 'uploads/bajas')));

// Rutas
app.use('/api/departments', departmentsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/backup-config', backupConfigRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/devices' , devicesRoutes);
app.use('/api/areas', areasRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/responsivas', responsivasRoutes);
app.use('/api/mantenimientos', mantenimientosRoutes);
app.use('/api/bajas', bajasRoutes);
app.use('/api/accessories', accessoriesRoutes);
app.use('/api/formats', formatsRoutes);
app.use('/api/floors', floorsRoutes);


// Puerto
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor API escuchando en puerto ${PORT}`);
});