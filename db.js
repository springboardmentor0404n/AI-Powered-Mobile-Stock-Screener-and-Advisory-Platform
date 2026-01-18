// db.js
const { Pool } = require("pg");

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "sample",
    password: "post",
    port: 5432
});

module.exports = pool;
