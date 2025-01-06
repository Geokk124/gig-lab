const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const Photo = require('../models/Photo');

// 配置文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/photos');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// 获取照片列表（按类别和月份分组）
router.get('/', async (req, res) => {
    try {
        const photos = await Photo.find().sort({ uploadDate: -1 });
        
        // 按类别分组
        const groupedPhotos = photos.reduce((acc, photo) => {
            const category = photo.category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(photo);
            return acc;
        }, {});

        // 在每个类别内按月份分组
        const result = {};
        for (const [category, categoryPhotos] of Object.entries(groupedPhotos)) {
            result[category] = categoryPhotos.reduce((acc, photo) => {
                const date = new Date(photo.uploadDate);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!acc[monthKey]) {
                    acc[monthKey] = [];
                }
                acc[monthKey].push(photo);
                return acc;
            }, {});
        }

        res.json(result);
    } catch (err) {
        console.error('获取照片列表失败:', err);
        res.status(500).send('Server Error');
    }
});

// 上传照片
router.post('/', auth, upload.array('photos'), async (req, res) => {
    try {
        const { category, descriptions } = req.body;
        let parsedDescriptions;
        
        try {
            parsedDescriptions = descriptions ? JSON.parse(descriptions) : [];
        } catch (err) {
            console.error('解析图片描述失败:', err);
            return res.status(400).json({ msg: '图片描述格式无效' });
        }

        const photos = req.files.map((file, index) => ({
            filename: file.filename,
            path: file.path.replace(/\\/g, '/'),
            category,
            description: parsedDescriptions[index] || '',
            uploadDate: new Date()
        }));
        
        const savedPhotos = await Photo.insertMany(photos);
        res.json(savedPhotos);
    } catch (err) {
        console.error('上传照片失败:', err);
        res.status(500).send('Server Error');
    }
});

// 删除照片
router.delete('/:id', auth, async (req, res) => {
    try {
        const photo = await Photo.findById(req.params.id);
        if (!photo) {
            return res.status(404).json({ msg: '照片不存在' });
        }

        // 删除文件
        const fs = require('fs');
        try {
            fs.unlinkSync(photo.path);
        } catch (err) {
            console.error('删除照片文件失败:', err);
        }

        await Photo.findByIdAndDelete(req.params.id);
        res.json({ msg: '照片已删除' });
    } catch (err) {
        console.error('删除照片失败:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router; 