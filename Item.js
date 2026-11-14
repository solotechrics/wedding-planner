const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    owner: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Item', itemSchema);
