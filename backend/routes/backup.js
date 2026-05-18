const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect, adminOnly } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

// Collections to include in backup (ordered to respect references)
const BACKUP_COLLECTIONS = [
  'users', 'brands', 'designs', 'customers', 'suppliers', 'employees',
  'categories', 'productnames', 'warehouses', 'storebranches', 'zones',
  'bins', 'racks', 'locations', 'types', 'units', 'services', 'expenses',
  'inventories', 'inventoryadjustments', 'invoices', 'purchaseorders',
  'purchaseorderreturns', 'transfers', 'payments', 'calendarevents',
  'settings', 'companies',
];

// GET /api/backup/export — export all collections as JSON
router.get('/export', protect, adminOnly, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const backup = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      collections: {},
    };

    const existingCollections = await db.listCollections().toArray();
    const existingNames = existingCollections.map((c) => c.name);

    for (const colName of BACKUP_COLLECTIONS) {
      if (existingNames.includes(colName)) {
        const docs = await db.collection(colName).find({}).toArray();
        backup.collections[colName] = docs;
      }
    }

    const json = JSON.stringify(backup, null, 2);
    const fileName = `wms-backup-${new Date().toISOString().split('T')[0]}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(json);
  } catch (err) {
    console.error('[Backup Export Error]', err);
    res.status(500).json({ message: err.message || 'Export failed' });
  }
});

// POST /api/backup/import — restore from backup JSON
router.post('/import', protect, adminOnly, upload.single('backup'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No backup file provided' });
    }

    let backup;
    try {
      backup = JSON.parse(req.file.buffer.toString('utf8'));
    } catch {
      return res.status(400).json({ message: 'Invalid JSON file' });
    }

    if (!backup.collections || typeof backup.collections !== 'object') {
      return res.status(400).json({ message: 'Invalid backup format: missing collections' });
    }

    const db = mongoose.connection.db;
    const results = {};
    let totalRestored = 0;

    for (const [colName, docs] of Object.entries(backup.collections)) {
      if (!Array.isArray(docs) || docs.length === 0) {
        results[colName] = { skipped: true, reason: 'empty' };
        continue;
      }

      try {
        // Drop existing and re-insert
        await db.collection(colName).deleteMany({});
        const insertResult = await db.collection(colName).insertMany(docs, { ordered: false });
        results[colName] = { restored: insertResult.insertedCount };
        totalRestored += insertResult.insertedCount;
      } catch (colErr) {
        results[colName] = { error: colErr.message };
      }
    }

    res.json({
      message: 'Import completed',
      exportedAt: backup.exportedAt,
      totalRestored,
      results,
    });
  } catch (err) {
    console.error('[Backup Import Error]', err);
    res.status(500).json({ message: err.message || 'Import failed' });
  }
});

module.exports = router;
