require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3000;

// Initialize DB then start listening
app.initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 Maham To-Do server running at http://localhost:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
