const router = require('express').Router();
const Item = require('../models/Item');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SORTS = {
  newest: { createdAt: -1 },
  name: { name: 1 },
  priceAsc: { price: 1 },
  priceDesc: { price: -1 },
};

// List + filter: ?owner=&q=&min=&max=&sort=
router.get('/', async (req, res) => {
  try {
    const { owner, q, min, max, sort } = req.query;
    const filter = {};
    if (owner) filter.owner = String(owner);
    if (q) filter.name = new RegExp(escapeRegex(String(q)), 'i');
    if (min || max) {
      filter.price = {};
      if (min) filter.price.$gte = Number(min);
      if (max) filter.price.$lte = Number(max);
    }
    res.json(await Item.find(filter).sort(SORTS[sort] || SORTS.newest));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Totals per owner + grand total (unfiltered)
router.get('/summary', async (_req, res) => {
  try {
    const rows = await Item.aggregate([
      { $group: { _id: '$owner', total: { $sum: '$price' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({
      byOwner: rows.map((r) => ({ owner: r._id, total: r.total, count: r.count })),
      grandTotal: rows.reduce((s, r) => s + r.total, 0),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { owner, name, price } = req.body;
    res.status(201).json(await Item.create({ owner, name, price }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, price } = req.body; // owner can't be changed
    const item = await Item.findByIdAndUpdate(
      req.params.id, { name, price }, { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ deleted: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
