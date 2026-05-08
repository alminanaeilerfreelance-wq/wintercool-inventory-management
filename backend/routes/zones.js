const express = require('express');
const router = express.Router();
const Zone = require('../models/Zone');
const { protect, adminOnly } = require('../middleware/auth');

// GET all with search + pagination
router.get('/', protect, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, noPagination } = req.query;

    // Search requirement: Name, Description, Warehouse name
    // Implemented via aggregation so we can filter by populated warehouse.name.
    const hasSearch = Boolean(String(search).trim());

    const pipeline = [];

    if (hasSearch) {
      pipeline.push(
        {
          $lookup: {
            from: 'warehouses',
            localField: 'warehouse',
            foreignField: '_id',
            as: 'warehouse',
          },
        },
        { $unwind: { path: '$warehouse', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } },
              { 'warehouse.name': { $regex: search, $options: 'i' } },
            ],
          },
        },
      );
    } else {
      pipeline.push(
        {
          $lookup: {
            from: 'warehouses',
            localField: 'warehouse',
            foreignField: '_id',
            as: 'warehouse',
          },
        },
        { $unwind: { path: '$warehouse', preserveNullAndEmptyArrays: true } }
      );
    }

    pipeline.push({ $sort: { createdAt: -1 } });

    if (!noPagination) {
      const skip = (Number(page) - 1) * Number(limit);
      const l = Number(limit);

      // total
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countRes = await Zone.aggregate(countPipeline);
      const total = countRes[0]?.total || 0;

      // items
      pipeline.push({ $skip: skip }, { $limit: l });
    }

    if (noPagination) {
      const items = await Zone.aggregate(pipeline);
      return res.json({ items, total: items.length });
    }

    // items (pagination)
    const items = await Zone.aggregate(pipeline);

    // total (pagination count)
    const countPipeline = pipeline.filter((s) => !s.$skip && !s.$limit).concat({ $count: 'total' });
    const countRes = await Zone.aggregate(countPipeline);
    const totalDocs = countRes[0]?.total || 0;

    res.json({
      items,
      total: totalDocs,
      page: Number(page),
      pages: Math.ceil(totalDocs / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// GET single
router.get('/:id', protect, async (req, res) => {
  try {
    const item = await Zone.findById(req.params.id).populate('warehouse');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create
router.post('/', protect, async (req, res) => {
  try {
    const { name, warehouseId, description } = req.body;

    // VALIDATION
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Create zone data with proper field mapping
    const zoneData = {
      name,
      description,
      warehouse: warehouseId || null,
    };

    const item = await Zone.create(zoneData);
    const populated = await item.populate('warehouse');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, warehouseId, description } = req.body;

    // Create update data with proper field mapping
    const updateData = {
      name,
      description,
      warehouse: warehouseId || null,
    };

    const item = await Zone.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate('warehouse');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await Zone.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
