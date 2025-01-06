const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const News = require('../models/News');
const auth = require('../middleware/auth');
const fs = require('fs');

// 配置文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/news');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// 获取新闻列表
router.get('/', async (req, res) => {
    try {
        const news = await News.find().sort({ date: -1 });
        res.json(news);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// 添加新闻（需要管理员权限）
router.post('/', auth, upload.array('images'), async (req, res) => {
    try {
        const { title, content, date, type, externalUrl, imageDescriptions } = req.body;
        
        // 验证必需字段
        if (!title || !content || !date || !type) {
            return res.status(400).json({ msg: '请填写所有必需字段' });
        }

        // 解析图片描述
        let descriptions = [];
        try {
            descriptions = imageDescriptions ? JSON.parse(imageDescriptions) : [];
        } catch (err) {
            console.error('解析图片描述失败:', err);
            return res.status(400).json({ msg: '图片描述格式无效' });
        }
        
        // 处理图片
        const images = req.files ? req.files.map((file, index) => ({
            filename: file.filename,
            path: file.path.replace(/\\/g, '/'), // 统一路径分隔符
            description: descriptions[index]?.description || '',
            sectionIndex: descriptions[index]?.sectionIndex || 0
        })) : [];

        // 解析内容
        let parsedContent;
        try {
            parsedContent = Array.isArray(content) ? content : JSON.parse(content);
            if (!Array.isArray(parsedContent)) {
                parsedContent = [parsedContent];
            }
        } catch (err) {
            console.error('解析内容失败:', err);
            parsedContent = [content]; // 如果解析失败，将内容作为单个段落
        }

        const news = new News({
            title,
            content: parsedContent,
            date: new Date(date),
            type,
            externalUrl,
            images
        });

        const savedNews = await news.save();
        res.json(savedNews);
    } catch (err) {
        console.error('保存新闻失败:', err);
        console.error(err.stack); // 打印完整的错误堆栈
        res.status(500).json({ msg: '服务器错误，保存新闻失败' });
    }
});

// 生成新闻页面的函数
function generateNewsPage(news) {
    return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${news.title} - Geophysics lab</title>
        <link rel="stylesheet" href="../styles.css">
    </head>
    <body>
        <header>
            <div class="container">
                <div class="logo-container">
                    <img src="../images/gig.png" alt="lab Logo" class="logo">
                    <img src="../images/lab.png" alt="lab name" class="lab-name">
                    <img src="../images/logo.png" alt="university Logo" class="university-logo">
                </div>
            </div>
            
            <div class="nav-wrapper">
                <div class="container">
                    <nav class="nav-menu">
                        <a href="../index.html" class="nav-item">
                            <img src="../images/icons/home-icon.jpg" alt="主页图标">
                            <span>主页</span>
                        </a>
                        <a href="../members.html" class="nav-item">
                            <img src="../images/icons/members-icon.png" alt="成员图标">
                            <span>成员</span>
                        </a>
                        <a href="../research.html" class="nav-item">
                            <img src="../images/icons/research-icon.jpg" alt="研究图标">
                            <span>研究</span>
                        </a>
                        <a href="../album.html" class="nav-item">
                            <img src="../images/icons/album-icon.png" alt="相册图标">
                            <span>相册</span>
                        </a>
                        <a href="../materials.html" class="nav-item">
                            <img src="../images/icons/materials-icon.png" alt="资料图标">
                            <span>组会资料</span>
                        </a>
                    </nav>
                </div>
            </div>
        </header>

        <div class="container">
            <article class="news-container">
                <!-- 标题和时间部分 -->
                <section class="section">
                    <div class="header">
                        <h2 class="title">${news.title}</h2>
                        <p class="time">${new Date(news.date).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')}</p>
                    </div>
                </section>

                <!-- 内容和图片部分 -->
                ${news.content.map((content, index) => {
                    const sectionImages = news.images.filter(img => Number(img.sectionIndex) === index);
                    return `
                        <section class="section">
                            <div class="content">
                                ${content.split('\n').map(para => para.trim() ? `<p>${para}</p>` : '').join('')}
                            </div>
                            ${sectionImages.length > 0 ? `
                                <div class="image-container">
                                    ${sectionImages.map(img => `
                                        <img src="/${img.path}" alt="${img.description || ''}">
                                        ${img.description ? `<p class="image-desc">${img.description}</p>` : ''}
                                    `).join('')}
                                </div>
                            ` : ''}
                        </section>
                    `;
                }).join('')}
            </article>
        </div>
    </body>
    </html>`;
}

// 删除新闻
router.delete('/:id', auth, async (req, res) => {
    try {
        const news = await News.findById(req.params.id);
        if (!news) {
            return res.status(404).json({ msg: '新闻不存在' });
        }

        // 删除相关的图片文件
        if (news.images && news.images.length > 0) {
            news.images.forEach(img => {
                try {
                    fs.unlinkSync(img.path);
                } catch (err) {
                    console.error('删除图片文件失败:', err);
                }
            });
        }

        await News.findByIdAndDelete(req.params.id);
        res.json({ msg: '新闻已删除' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// 获取新闻详情
router.get('/detail/:id', async (req, res) => {
    try {
        const news = await News.findById(req.params.id);
        if (!news) {
            return res.status(404).send('新闻不存在');
        }

        res.render('news-detail', { news }); // 使用模板引擎渲染
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// 获取单个新闻
router.get('/:id', async (req, res) => {
    try {
        const news = await News.findById(req.params.id);
        if (!news) {
            return res.status(404).json({ msg: '新闻不存在' });
        }
        res.json(news);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// 更新新闻
router.put('/:id', auth, upload.array('images'), async (req, res) => {
    try {
        const { 
            title, 
            content, 
            date, 
            type, 
            externalUrl, 
            imageDescriptions,
            'existing-image-descriptions': existingDescriptions,
            'existing-image-paths': existingPaths
        } = req.body;

        // 验证必需字段
        if (!title || !content || !date || !type) {
            return res.status(400).json({ msg: '请填写所有必需字段' });
        }

        const newsId = req.params.id;
        const news = await News.findById(newsId);
        
        if (!news) {
            return res.status(404).json({ msg: '新闻不存在' });
        }

        // 处理现有图片
        let existingImages = [];
        if (existingPaths) {
            const paths = Array.isArray(existingPaths) ? existingPaths : [existingPaths];
            const descriptions = Array.isArray(existingDescriptions) ? existingDescriptions : [existingDescriptions];
            existingImages = paths.map((path, index) => ({
                path,
                description: descriptions[index] || ''
            }));
        }

        // 处理新上传的图片
        let descriptions = [];
        try {
            descriptions = imageDescriptions ? JSON.parse(imageDescriptions) : [];
        } catch (err) {
            console.error('解析图片描述失败:', err);
            return res.status(400).json({ msg: '图片描述格式无效' });
        }

        const newImages = req.files ? req.files.map((file, index) => ({
            filename: file.filename,
            path: file.path.replace(/\\/g, '/'),
            description: descriptions[index]?.description || '',
            sectionIndex: descriptions[index]?.sectionIndex || 0
        })) : [];

        // 解析内容
        let parsedContent;
        try {
            parsedContent = JSON.parse(content);
        } catch (err) {
            console.error('解析内容失败:', err);
            return res.status(400).json({ msg: '内容格式无效' });
        }

        // 更新新闻
        news.title = title;
        news.content = parsedContent;
        news.date = date;
        news.type = type;
        news.externalUrl = externalUrl;
        news.images = [...existingImages, ...newImages];

        const updatedNews = await news.save();
        res.json(updatedNews);
    } catch (err) {
        console.error('更新新闻失败:', err);
        res.status(500).json({ msg: '服务器错误，更新新闻失败' });
    }
});

module.exports = router; 