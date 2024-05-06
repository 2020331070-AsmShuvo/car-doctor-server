const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const morgan = require("morgan");
const port = process.env.PORT || 3000;
const jwt = require("jsonwebtoken"); //jwt1
const cookieParser = require("cookie-parser"); //jwt1

app.use(
  cors({
    origin: ["http://localhost:5173"], //jwt 2
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ezfvwv5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middle wares
const logger = async (req, res, next) => {
  console.log("called: ", req.host, req.originalUrl);
  next();
};

const verrifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log("value of the token is :", token);
  if (!token) {
    return res.status(401).send({ message: "not authorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    // error
    if (err) {
      console.log("err", err);
      return res.status(401).send({ message: "unauthorized" });
    }
    console.log("value in the token", decoded);
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const carCollection = client.db("carDoctorDB").collection("services");
    const bookingCollection = client.db("carDoctorDB").collection("bookings");

    app.get("/services", logger, async (req, res) => {
      const cursor = carCollection.find();
      const result = await cursor.toArray();
      res.send(result); // can find on the server now
    });

    app.post("/bookings", logger, async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      // create token // jwt 4
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "2h",
      });
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      });
      res.send({ success: true });
    });

    app.get("/bookings", logger, verrifyToken, async (req, res) => {
      // console.log("tookeeen: ", req.cookies.token);
      console.log(req.query.email);
      //ater token varification
      if (req.user.email != req.query.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        // Include only the `title` and `imdb` fields in the returned document
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await carCollection.findOne(query, options);
      // console.log(result);
      res.send(result);
    });
    // ====get some data====

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`Car Doctor is running on port ${port}`);
});
