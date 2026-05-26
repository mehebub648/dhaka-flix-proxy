require('dotenv').config();
const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();

// Configuration from environment variables with defaults
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-scratchers-key';
const PASSWORD = process.env.PASSWORD || 'passforscratchers';
const UPSTREAM_TARGET = process.env.UPSTREAM_TARGET || 'http://172.16.50.14';

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Global middleware to set headers preventing all search engine indexing
app.use((req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    next();
});

// Robots.txt route (unprotected)
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send("User-agent: *\nDisallow: /");
});

// Login route (unprotected)
app.get('/login', (req, res) => {
    const token = req.cookies.auth_token;
    if (token) {
        try {
            // If already authenticated, redirect to home page
            jwt.verify(token, JWT_SECRET);
            return res.redirect('/');
        } catch (err) {
            // Clear invalid cookie
            res.clearCookie('auth_token');
        }
    }
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/login', (req, res) => {
    if (req.body.password === PASSWORD) {
        const token = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: '7d' });
        const isProduction = process.env.NODE_ENV === 'production';
        
        res.cookie('auth_token', token, { 
            httpOnly: true, 
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
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
        res.clearCookie('auth_token');
        return res.redirect('/login');
    }
});

// Serve local static assets first (including cached _h5ai assets)
app.use(express.static(path.join(__dirname, 'public')));

// Fallback: proxy _h5ai requests to upstream if not found locally
app.use('/_h5ai', createProxyMiddleware({
    target: UPSTREAM_TARGET,
    changeOrigin: true,
    on: {
        proxyRes: (proxyRes, req, res) => {
            proxyRes.headers['x-robots-tag'] = 'noindex, nofollow, noarchive, nosnippet';
        }
    }
}));

// Proxy routes for DHAKA-FLIX servers
app.use('/DHAKA-FLIX-:id', createProxyMiddleware({
    target: UPSTREAM_TARGET, // Fallback target
    router: (req) => {
        // Robust parameter matching (works with express v4 and v5 path parameters or raw URL extraction)
        let id = req.params.id;
        if (!id) {
            const match = req.originalUrl.match(/\/DHAKA-FLIX-(\d+)/i);
            if (match) {
                id = match[1];
            }
        }
        if (id) {
            return `http://172.16.50.${id}/DHAKA-FLIX-${id}`;
        }
        return UPSTREAM_TARGET;
    },
    changeOrigin: true,
    on: {
        proxyRes: (proxyRes, req, res) => {
            proxyRes.headers['x-robots-tag'] = 'noindex, nofollow, noarchive, nosnippet';
        }
    }
}));

app.listen(PORT, () => {
    console.log(`Proxy running at http://localhost:${PORT}`);
});