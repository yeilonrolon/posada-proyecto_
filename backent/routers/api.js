const express = require('express');
const router = express.Router();

const recursosRoutes = require('./recursos');
const seguridadRoutes = require('./seguridad');
const usuariosRoutes = require('./usuarios');
const estadosRoutes = require('./estados');
const costosRoutes = require('./costos');
const equiposRoutes = require('./backent-qr');
const pdfRoutes = require('./pdf');

router.use('/', recursosRoutes);
router.use('/', seguridadRoutes);
router.use('/', usuariosRoutes);
router.use('/', estadosRoutes);
router.use('/', costosRoutes);
router.use('/api/equipos', equiposRoutes);
router.use('/pdf', pdfRoutes);

module.exports = router;
