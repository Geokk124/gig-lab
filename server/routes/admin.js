const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

// 管理员登录
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // 这里简单示例，实际应该从数据库验证
        if (username === 'admin' && password === 'password123') {
            const payload = {
                user: {
                    id: 1,
                    username: 'admin'
                }
            };

            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '1h' },
                (err, token) => {
                    if (err) throw err;
                    res.json({ token });
                }
            );
        } else {
            res.status(400).json({ msg: '用户名或密码错误' });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// 验证token
router.get('/verify', auth, (req, res) => {
    res.json({ msg: 'Token is valid' });
});

module.exports = router; 