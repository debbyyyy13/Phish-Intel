const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
    type: { type: String, required: true, unique: true },
    settings: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    version: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('Config', ConfigSchema);