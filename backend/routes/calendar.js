const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const CalendarEvent = require('../models/CalendarEvent');

// GET all with search + optional date range + pagination + branch filtering
router.get('/', protect, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, start, end } = req.query;
    const query = {};

    // If user is not admin, filter by their assigned branch
    if (req.user && req.user.role !== 'admin') {
      const user = await User.findById(req.user._id);
      if (user && user.assignedBranch) {
        query.storeBranch = user.assignedBranch;
      }
    }

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    if (start || end) {
      const startDateRange = start ? new Date(start) : null;
      const endDateRange = end ? new Date(end) : null;
      query.$or = [];

      if (startDateRange && endDateRange) {
        query.$or.push(
          { startDate: { $gte: startDateRange, $lte: endDateRange } },
          { endDate: { $gte: startDateRange, $lte: endDateRange } },
          { startDate: { $lte: startDateRange }, endDate: { $gte: endDateRange } }
        );
      } else if (startDateRange) {
        query.$or.push({ endDate: { $gte: startDateRange } }, { startDate: { $gte: startDateRange } });
      } else if (endDateRange) {
        query.$or.push({ startDate: { $lte: endDateRange } }, { endDate: { $lte: endDateRange } });
      }

      if (query.$or.length === 0) delete query.$or;
    }

    const total = await CalendarEvent.countDocuments(query);
    const items = await CalendarEvent.find(query)
      .populate('storeBranch', 'name')
      .sort({ startDate: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ items, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single
router.get('/:id', protect, async (req, res) => {
  try {
    const item = await CalendarEvent.findById(req.params.id).populate('storeBranch', 'name');
    if (!item) return res.status(404).json({ message: 'Not found' });
    
    // If user is not admin, check they have access to this event
    if (req.user && req.user.role !== 'admin') {
      const user = await User.findById(req.user._id);
      if (!user || !user.assignedBranch || !item.storeBranch || !item.storeBranch._id.equals(user.assignedBranch)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create
router.post('/', protect, async (req, res) => {
  try {
    // Check permission: admin OR own branch
    if (req.user.role !== 'admin') {
      if (!req.user.assignedBranch || !req.body.storeBranch) {
        return res.status(403).json({ message: 'You can only create events for your assigned branch' });
      }
      if (typeof req.body.storeBranch === 'string' && req.body.storeBranch !== req.user.assignedBranch.toString() &&
          req.body.storeBranch !== req.user.assignedBranch) {
        return res.status(403).json({ message: 'You can only create events for your assigned branch' });
      }
    }

    const item = await CalendarEvent.create(req.body);
    await item.populate('storeBranch', 'name');
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update
router.put('/:id', protect, async (req, res) => {
  try {
    const item = await CalendarEvent.findById(req.params.id).populate('storeBranch', 'name');
    if (!item) return res.status(404).json({ message: 'Not found' });

    // Check permission: admin OR own branch
    if (req.user.role !== 'admin') {
      if (!req.user.assignedBranch || !item.storeBranch?._id.equals(req.user.assignedBranch)) {
        return res.status(403).json({ message: 'You can only edit events for your assigned branch' });
      }
    }

    const updatedItem = await CalendarEvent.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('storeBranch', 'name');
    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', protect, async (req, res) => {
  try {
    const item = await CalendarEvent.findById(req.params.id).populate('storeBranch', 'name');
    if (!item) return res.status(404).json({ message: 'Not found' });

    // Check permission: admin OR own branch
    if (req.user.role !== 'admin') {
      if (!req.user.assignedBranch || !item.storeBranch?._id.equals(req.user.assignedBranch)) {
        return res.status(403).json({ message: 'You can only delete events for your assigned branch' });
      }
    }

    await CalendarEvent.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
