const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 3000;

// const corsOptions = {
//    origin: ["http://localhost:5173"],
//    credentials: true,
//    optionSuccessStatus: 200,
// };

// middlewares:
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j7c4zww.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
   serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
   },
});

async function run() {
   try {
      const usersCollection = client.db("social-app").collection("users");
      const postsCollection = client.db("social-app").collection("posts");

      /********** JWT Related APIs ************/

      // Create a token against a user email
      app.post("/jwt", async (req, res) => {
         const user = req.body;
         const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "7d",
         });
         res.send({ token });
      });

      // middlewares:
      const verifyToken = (req, res, next) => {
         console.log(req.headers);
         console.log(
            "from middleware verify token: ",
            req.headers.authorization
         );

         if (!req.headers.authorization) {
            return res.status(401).send({ message: "Unauthorized Access" });
         }

         const token = req.headers.authorization.split(" ")[1];

         jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
               return res.status(401).send({ message: "Unauthorized Access" });
            }

            req.decoded = decoded;

            next();
         });
      };

      /********** Users Related APIs ************/

      // enter a employee if not already added to database
      app.post("/users", async (req, res) => {
         const data = req.body;
         console.log("registered/ google sign in: ", data);
         const email = data.email;
         const query = { email: email };

         const isExist = await usersCollection.findOne(query);
         console.log("is Exist in db already: ", isExist);
         if (isExist) {
            return res.send(isExist);
         }
         const result = await usersCollection.insertOne(data);
         res.send(result);
      });

      app.get("/users", async (req, res) => {
         const result = await usersCollection.find().toArray();
         res.send(result);
      });

      /********** Posts Related APIs ************/

      //   get all posts
      app.get("/posts", async (req, res) => {
         const result = await postsCollection.find().toArray();
         res.send(result);
      });

      // delete a post
      app.delete("/post/:id", verifyToken, async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const result = postsCollection.deleteOne(query);
         res.send(result);
      });

      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log(
         "Pinged your deployment. You successfully connected to MongoDB!"
      );
   } finally {
      // Ensures that the client will close when you finish/error
   }
}
run().catch(console.dir);

// for testing
app.get("/", (req, res) => {
   res.send("Social App is Running");
});

// listen
app.listen(port, () => {
   console.log(`Social App is running at port: ${port}`);
});
