export default {
    root: 'src/',
    publicDir: '../static/',
    base: './',
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5001',
                changeOrigin: true,
            }
        }
    }
}