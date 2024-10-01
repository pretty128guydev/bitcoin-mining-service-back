const db = require("../config/db");

// Function to create a transaction
const createTransaction = (userId, description, amount, callback) => {
  const query =
    "INSERT INTO transactions (user_id, description, amount, created_at) VALUES (?, ?, ?, NOW())";
  db.query(query, [userId, description, amount], callback);
};

// Function to get all transactions for a user
const getTransactionsForUser = (userId, callback) => {
  const query = `
    SELECT 
      transactions.id AS transactionId,
      transactions.created_at AS createdAt,
      transactions.description,
      transactions.amount,
      users.id AS userId,
      users.firstname AS userFirstName,
      users.lastname AS userLastName
    FROM transactions
    JOIN users ON transactions.user_id = users.id
    WHERE transactions.user_id = ?
    ORDER BY transactions.created_at DESC
  `;
  db.query(query, [userId], callback);
};

// Function to delete a transaction
const deleteTransaction = (transactionId, callback) => {
  const query = "DELETE FROM transactions WHERE id = ?";
  db.query(query, [transactionId], callback);
};

module.exports = {
  createTransaction,
  getTransactionsForUser,
  deleteTransaction,
};
