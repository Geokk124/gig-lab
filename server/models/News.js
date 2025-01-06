const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: [String],
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    type: {
        type: String,
        enum: ['local', 'external'],
        required: true
    },
    externalUrl: {
        type: String,
        required: function() {
            return this.type === 'external';
        }
    },
    images: [{
        filename: String,
        path: String,
        description: String,
        sectionIndex: {
            type: Number,
            default: 0
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('News', newsSchema); 