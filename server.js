const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/authRoutes");
require("./utils/websocket");

const app = express();

const corsOpts = {
  origin: "*",
  "Access-Control-Allow-Origin": "*",
};

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

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
