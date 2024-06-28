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
         const result = await postsCollection
            .find()
            .sort({ postTime: -1 })
            .toArray();
         res.send(result);
      });

      // post a new post
      app.post("/posts", verifyToken, async (req, res) => {
         const data = req.body;
         const result = await postsCollection.insertOne(data);
         res.send(result);
      });

      // edit a post
      app.patch("/posts/edit/:id", async (req, res) => {
         const id = req.params.id;
         const { postDescription, postImage } = req.body;
         const updateFields = { postDescription };

         if (postImage) {
            updateFields.postImage = postImage;
         }

         try {
            const result = await postsCollection.updateOne(
               { _id: new ObjectId(id) },
               { $set: updateFields }
            );

            if (result.modifiedCount === 1) {
               res.status(200).send("Post updated successfully");
            } else {
               res.status(404).send("Post not found");
            }
         } catch (error) {
            console.error(error);
            res.status(500).send("An error occurred while updating the post");
         }
      });

      // like a post
      app.patch("/posts/like/:id", async (req, res) => {
         try {
            const postId = req.params.id;
            const userEmail = req.body.likedBy;

            // Find the post by ID
            const post = await postsCollection.findOne({
               _id: new ObjectId(postId),
            });

            if (!post) {
               return res.status(404).send("Post not found");
            }

            // Initialize likes array if it doesn't exist
            const likes = post.likes || [];

            // Check if the user's email already exists in the likes array
            const likedByUser = likes.some(
               (like) => like.likedBy === userEmail
            );

            if (likedByUser) {
               // User already liked the post, remove their like
               await postsCollection.updateOne(
                  { _id: new ObjectId(postId) },
                  { $pull: { likes: { likedBy: userEmail } } }
               );
               res.send({ message: "Like removed" });
            } else {
               // User hasn't liked the post, add their like
               await postsCollection.updateOne(
                  { _id: new ObjectId(postId) },
                  { $push: { likes: { likedBy: userEmail } } }
               );
               res.send({ message: "Post liked" });
            }
         } catch (error) {
            console.error(error);
            res.status(500).send(
               "An error occurred while processing the request"
            );
         }
      });

      // delete a post
      app.delete("/post/:id", verifyToken, async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const result = await postsCollection.deleteOne(query);
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
