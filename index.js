const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const JWT_SECRET = 'super-secret-scratchers-key';
const PASSWORD = 'passforscratchers';

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Login route (unprotected)
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/login', (req, res) => {
    if (req.body.password === PASSWORD) {
        const token = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('auth_token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.redirect('/');
    } else {
        res.redirect('/login?error=1');
    }
});

// Global authentication middleware
app.use((req, res, next) => {
    const token = req.cookies.auth_token;
    if (!token) {
        return res.redirect('/login');
    }
    try {
        jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.redirect('/login');
    }
});

// Serve local static assets first (including cached _h5ai assets)
app.use(express.static(path.join(__dirname, 'public')));

// Fallback: proxy _h5ai requests to upstream if not found locally
app.use('/_h5ai', createProxyMiddleware({
    target: 'http://172.16.50.14',
    changeOrigin: true,
}));

app.use('/DHAKA-FLIX-:id', createProxyMiddleware({
    target: 'http://localhost',
    router: (req) => {
        const id = req.params.id;
        return `http://172.16.50.${id}/DHAKA-FLIX-${id}`;
    },
    changeOrigin: true,
}));

app.listen(3001, () => {
    console.log('Proxy running at http://localhost:3001');
});