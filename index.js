const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
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
    // await client.connect();

    const studentsCollection = client.db("martialDB").collection("students");
    const classesCollection = client.db("martialDB").collection("classes");
    const instructorCollection = client.db("martialDB").collection("instructors");
    const cartCollection = client.db("martialDB").collection("carts");

    // jwt
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })

      res.send({ token })
    })

    // user api
    app.get('/students', async(req, res)=>{
      const result = await studentsCollection.find().toArray();
      res.send(result)
    })

    // students api
    app.post('/students', async (req, res) => {
      const students = req.body;
      const query = { email: students.email }
      const existingStudent = await studentsCollection.findOne(query);
      if (existingStudent) {
        return res.send({ message: 'student already exists' })
      }
      const result = await studentsCollection.insertOne(students);
      res.send(result)
    })

    // updated admin 
    app.patch('/students/admin/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set: {
          role: 'admin'
        },
      };

      const result = await studentsCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })

    // updated instructors 
    app.patch('/students/instructor/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set: {
          role: 'instructor'
        },
      };

      const result = await studentsCollection.updateOne(filter, updatedDoc);
      res.send(result)
    }) 



    // classes apis
    app.get('/classes', async (req, res) => {
      const result = await classesCollection.find().sort({
        studentEnroll: -1
      }).toArray();
      res.send(result);
    })


    app.get('/top-classes', async (req, res) => {
      const classes = await classesCollection.find().limit(6).sort({
        studentEnroll: -1
      }).toArray();
      res.send(classes);
    })

    // Instructor api
    app.get('/all-instructors', async (req, res) => {
      const instructor = await instructorCollection.find().toArray();
      res.send(instructor);
    })
    // app.get('/instructor', async (req, res) => {
    //     const instructor = await instructorCollection.find().limit(6).toArray();
    //     res.send(instructor);
    // })


    // cart collection apis
    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result)
    });
    app.post('/carts', async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });

    // delete classes
    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello Brother I am Running Now You Can Do This')
});


app.listen(port, () => {
  console.log(`server site is running port: ${port}`);
})