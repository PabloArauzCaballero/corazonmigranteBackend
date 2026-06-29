require('dotenv').config();
module.exports = {
  development: {
    username: process.env.DATABASE_USER || 'corazon',
    password: process.env.DATABASE_PASSWORD || 'corazon',
    database: process.env.DATABASE_NAME || 'corazon_migrante',
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 5432),
    dialect: 'postgres',
    logging: process.env.DATABASE_LOGGING === 'true' ? console.log : false,
    dialectOptions: process.env.DATABASE_SSL === 'true' ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  },
  test: {
    username: process.env.DATABASE_USER || 'corazon',
    password: process.env.DATABASE_PASSWORD || 'corazon',
    database: process.env.DATABASE_NAME || 'corazon_migrante_test',
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 5432),
    dialect: 'postgres',
    logging: false,
  },
  production: {
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT || 5432),
    dialect: 'postgres',
    logging: false,
    dialectOptions: process.env.DATABASE_SSL === 'true' ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  },
};
