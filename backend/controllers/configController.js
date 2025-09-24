const Config = require('../models/Config');
const { validationResult } = require('express-validator');

exports.getConfig = async (req, res) => {
    try {
        const config = await Config.findOne({ type: 'app_settings' });
        res.json({ success: true, data: config?.settings || {} });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateConfig = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { settings } = req.body;
        
        const config = await Config.findOneAndUpdate(
            { type: 'app_settings' },
            { settings, updatedBy: req.user._id },
            { new: true, upsert: true }
        );

        res.json({ success: true, data: config.settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};