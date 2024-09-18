const mysql = require("mysql2");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSKEY,
});
db.connect((err) => {
  if (err) throw err;
  console.log("Connected to MySQL");
  db.query(
    `CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`,
    function (err, result) {
      if (err) throw err;
      console.log("Database created");
    }
  );
  const db2 = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSKEY,
    database: process.env.DB_NAME,
  });
  db2.query(
    `CREATE TABLE IF NOT EXISTS users ( 
    id INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(50) NOT NULL,
    lastName VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phoneNumber VARCHAR(15),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`,
    function (err, result) {
      if (err) throw err;
      console.log("users table created");
    }
  );
  db2.query(
    `CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    senderId INT NOT NULL,
    recipientId INT NOT NULL,
    content VARCHAR(255) NOT NULL,
    read_status VARCHAR(10) DEFAULT 'unread',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (senderId) REFERENCES users(id),
    FOREIGN KEY (recipientId) REFERENCES users(id))`,
    function (err, result) {
      if (err) throw err;
      console.log("messages table created");
    }
  );
});

module.exports = db;
