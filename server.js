const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/authRoutes");
const userModel = require("./models/user")
require("./utils/websocket");

const app = express();

const corsOpts = {
  origin: "*",
  "Access-Control-Allow-Origin": "*",
};

app.use(express.static('frontend/build'));
app.get('/', function (req, res) {
  res.sendFile(__dirname + "/" + "index.html");
})

app.get('/uploads/passport_images/:filename', function (req, res) {
  const fileName = req.params.filename;
  const filePath = __dirname + "/uploads/passport_images/" + fileName;

  res.sendFile(filePath, function (err) {
    if (err) {
      res.status(404).send('File not found!');
    }
  });
});


app.use(cors(corsOpts));
app.use(bodyParser.json());

app.use("/api", authRoutes);

setInterval(() => {
  userModel.getAllUsers((err, users) => {
    if (err) {
      console.error("Error fetching users", err);
      return; // Exit early if there's an error
    }

    // Ensure users is an array before calling map
    if (Array.isArray(users) && users.length > 0) {
      users.map((user, index) => {
      if (user.package_status === "active") {
        userModel.updateButtonClicksintozero(user.id, (err, result) => {
          console.log(result)
        })
      } else {
        console.log(`${user.id} user hasn't bought any package`)
      }
      });
    } else {
      console.log("No users found.");
    }
  });
}, 60000);


app.listen(8080, () => {
  console.log("Server running on port 80");
});
