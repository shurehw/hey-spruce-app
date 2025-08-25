const app = require('./api/index.js');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API Health Check: http://localhost:${PORT}/api/health`);
    console.log(`Vendor endpoint: http://localhost:${PORT}/api/vendors`);
});