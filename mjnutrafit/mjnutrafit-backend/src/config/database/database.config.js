require('dotenv').config();

let databaseConfig = {};

if (process.env.DATABASE_URL) {
  const urlString = process.env.DATABASE_URL.replace(/^postgresql:\/\//, 'postgres://');
  const url = new URL(urlString);
  
  databaseConfig = {
    host: url.hostname,
    port: parseInt(url.port || "5432"),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  };
} else {
  databaseConfig = {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "mjnutrafit",
    dialect: "postgres",
    dialectOptions: {
      ssl: process.env.NODE_ENV === "production" ? {
        require: true,
        rejectUnauthorized: false,
      } : false,
    },
  };
}

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || "JWT_SECRET",
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || "REFRESH_TOKEN_SECRET",
  database: databaseConfig,
};
