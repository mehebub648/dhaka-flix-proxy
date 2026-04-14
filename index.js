const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

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