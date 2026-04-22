const app = require('./app');
const config = require("./config/database/database.config");
const { initializeDatabase } = require("./config/database/initialize-database.config");

const PORT = config.port || process.env.PORT || 3000;

initializeDatabase()
  .then(() => {
    const dbName = config.database?.database || config.database?.name || 'database';
    console.log(`Connected to postgres database ${dbName}`);
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error.message || error);
    console.log(`Attempting to start server on port ${PORT} anyway...`);
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} (database connection may be limited)`);
    });
  });
