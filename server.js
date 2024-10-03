const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/authRoutes");
const userModel = require("./models/user")
const transactionModel = require("./models/transactions")
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
            if (err) {
              console.error("Error fetching Button Clicks->", err);
            } else {
              userModel.getDailyEarning(user.id, (err, daily_earning) => {
                if (err) {
                  console.error("Error fetching daily_earning->", err);
                  console.log("Error fetching daily_earning");
                }
                userModel.updateDailyEarningZero(user.id, (err, result) => {
                  if (err) {
                    console.log("Error updating daily earning");
                  }
                  // Check if the update was successful
                  if (result.affectedRows === 0) {
                    console.log("daily earning not found");
                  }
                  const newclicked = "unclicked"
                  userModel.updateClicked(user.id, newclicked, (err, result) => {
                    if (err) {
                      console.log("Error updating daily earning");
                    }
                    // Check if the update was successful
                    if (result.affectedRows === 0) {
                      console.log("daily earning not found");
                    }
                  })
                  // if (daily_earning != 0) {
                  // const description = `Daily Eearning $${daily_earning}`;
                  // const amount = daily_earning;
                  // transactionModel.createTransaction(
                  //   user.id,
                  //   description,
                  //   amount,
                  //   (err, result) => {
                  //     if (err) {
                  //       console.log(`${err.message}`);
                  //     }
                  //     console.log("Payment is created");
                  //   }
                  // );
                  // }
                })
              })
            }


          })
        } else {
          console.log(`${user.id} user hasn't bought any package`)
        }
      });
    } else {
      console.log("No users found.");
    }
  });
}, 100000);


app.listen(8080, () => {
  console.log("Server running on port 80");
});
