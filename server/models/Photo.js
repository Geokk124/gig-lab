const mongoose = require('mongoose');

const PhotoSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['academic', 'daily'],
        required: true
    },
    description: String,
    uploadDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Photo', PhotoSchema); 