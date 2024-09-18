const mysql = require("mysql2");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSKEY,
  database: process.env.DB_NAME,
});
db.connect((err) => {
  if (err) throw err;
  console.log("Connected to MySQL");
  db.query(`USE ${process.env.DB_NAME};`);
});

module.exports = db;
