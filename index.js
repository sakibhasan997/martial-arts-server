const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7suhtvy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const classesCollection = client.db('martialDB').collection('classes');
    const instructorCollection = client.db('martialDB').collection('instructors');

    app.get('/classes', async (req, res) => {
        const classes = await classesCollection.find().sort({
            student_enroll: -1
        }).toArray();
        res.send(classes);
    })

    app.get('/top-classes', async (req, res) => {
        const classes = await classesCollection.find().limit(6).sort({
            student_enroll: -1
        }).toArray();
        res.send(classes);
    })


    // Instructor api
    app.get('/all-instructor', async (req, res) => {
        const instructor = await instructorCollection.find().toArray();
        res.send(instructor);
    })
    app.get('/instructor', async (req, res) => {
        const instructor = await instructorCollection.find().limit(6).toArray();
        res.send(instructor);
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello Brother I am Running Now You Can Do This')
  });
  
  
  app.listen(port, () => {
    console.log(`server site is running port: ${port}`);
  })