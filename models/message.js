const db = require("../config/db"); // Replace with your actual database connection

// Function to create a message
const createMessage = (
  senderId,
  recipientId,
  content,
  read_status,
  callback
) => {
  const query =
    "INSERT INTO messages (sender_id, recipient_id, content, read_status, created_at) VALUES (?, ?, ?, ?, NOW())";
  db.query(query, [senderId, recipientId, content, read_status], callback);
  //   db.query(query, [2, 3, "content"], callback);
};

// Function to get messages for a user
const getMessagesForUser = (userId, callback) => {
  const query = `
      SELECT 
        messages.id AS messageId,
        messages.created_at AS createdAt,
        messages.content,
        users.id AS senderId,
        users.firstname AS senderFirstName,
        users.lastname AS senderLastName,
        users.email AS senderEmail,
        users.phoneNumber AS senderPhoneNumber
      FROM messages
      JOIN users ON messages.sender_id = users.id
      WHERE messages.recipient_id = ?
      ORDER BY messages.created_at DESC
    `;

  db.query(query, [userId], (err, results) => {
    if (err) return callback(err, null);
    results.forEach((message) => {
      message.content = message.content.replace(/\n/g, "<br />");
    });
    callback(null, results);
  });
};

const deleteMessage = (messageId, callback) => {
  const query = "DELETE FROM messages WHERE id = ?";
  db.query(query, [messageId], (err, result) => {
    callback(err, result);
  });
};

const getUnreadMessagesForUser = (userId, callback) => {
  const query = `
      SELECT 
        messages.id AS messageId,
        messages.created_at AS createdAt,
        messages.content,
        users.id AS senderId,
        users.firstname AS senderFirstName,
        users.lastname AS senderLastName,
        users.email AS senderEmail,
        users.phoneNumber AS senderPhoneNumber
      FROM messages
      JOIN users ON messages.sender_id = users.id
      WHERE messages.recipient_id = ? AND messages.read_status = 'unread'
      ORDER BY messages.created_at DESC
    `;

  db.query(query, [userId], (err, results) => {
    if (err) return callback(err, null);
    callback(null, results);
  });
};

const markMessageAsRead = (recipient_id, callback) => {
  // Check if there are any messages for the recipient
  const checkQuery =
    "SELECT COUNT(*) as count FROM messages WHERE recipient_id = ?";
  db.query(checkQuery, [recipient_id], (err, results) => {
    if (err) {
      return callback(err, null);
    }

    if (results[0].count === 0) {
      return callback(new Error("No messages found for this recipient"), null);
    }
    console.log(results[0].count)

    // If messages exist, update the read_status
    const updateQuery =
      "UPDATE messages SET read_status = ? WHERE recipient_id = ?";
    const values = ["read", recipient_id];
    db.query(updateQuery, values, (err, result) => {
      callback(err, result);
    });
  });
};

module.exports = {
  createMessage,
  getMessagesForUser,
  deleteMessage,
  getUnreadMessagesForUser,
  markMessageAsRead,
};
