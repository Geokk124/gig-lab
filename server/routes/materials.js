const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const Material = require('../models/Material');
const fs = require('fs');

// 配置文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/materials');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// 获取资料列表
router.get('/', async (req, res) => {
    try {
        const materials = await Material.find().sort({ uploadDate: -1 });
        res.json(materials);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// 上传资料
router.post('/', auth, upload.single('file'), async (req, res) => {
    try {
        const material = new Material({
            title: req.body.title,
            filename: req.file.filename,
            path: req.file.path,
            description: req.body.description || ''
        });
        
        const savedMaterial = await material.save();
        res.json(savedMaterial);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// 删除资料
router.delete('/:id', auth, async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ msg: '资料不存在' });
        }

        // 删除文件
        try {
            fs.unlinkSync(material.path);
        } catch (err) {
            console.error('删除文件失败:', err);
        }

        await Material.findByIdAndDelete(req.params.id);
        res.json({ msg: '资料已删除' });
    } catch (err) {
        console.error('删除资料失败:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router; 