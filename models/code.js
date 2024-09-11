class CodeModel {
  constructor(code, status) {
    this.code = code; // String value for the code
    this.status = status; // Boolean value for the status
  }

  // Method to validate the code
  validate() {
    return (
      typeof this.code === "string" &&
      this.code.trim() !== "" &&
      typeof this.status === "boolean"
    );
  }

  // Method to display the code model details
  display() {
    console.log(`Code: ${this.code}, Status: ${this.status}`);
  }

  // Static method to check the invitation code from the database
  static async checkInvitationCode(code) {
    const query = `SELECT * FROM invitation_codes WHERE code = ?`;
    // Assuming you have a db connection setup
    // return new Promise((resolve, reject) => {
    //   db.query(query, [code], (err, result) => {
    //     if (err) {
    //       return reject(err);
    //     }
    //     if (result.length === 0) {
    //       // No code found
    //       return resolve(null);
    //     }
    //     // Return the first result (assuming unique code)
    //     resolve(result[0]);
    //   });
    // });
    db.query(query, [code], callback);
  }
}

module.exports = CodeModel;
