const { Sequelize } = require("sequelize");
const config = require("./database.config");

const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    dialectOptions: config.database.dialectOptions,
  }
);

module.exports = { sequelize };
