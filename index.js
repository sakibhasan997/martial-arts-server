const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) =>{
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'unauthorized access'});
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded)=>{
    if(err){
      return res.status(401).send({error: true, message: 'unauthorized access'})
    }
    req.decoded = decoded;
    next();
  })
}



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
    const paymentCollection = client.db("martialDB").collection("payments");

    // jwt
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '2 day' }) // TODO: 1h

      res.send({ token })
    })

    const verifyAdmin = async (req, res, next)=>{
      const email = req.decoded.email;
      const query = {email: email}
      const user = await studentsCollection.findOne(query);
      if(user?.role !== 'admin'){
        return res.status(403).send({error: true, message: 'forbidden message'})
      }
      next();
    }
    const verifyInstructor = async (req, res, next)=>{
      const email = req.decoded.email;
      const query = {email: email}
      const user = await studentsCollection.findOne(query);
      if(user?.role !== 'instructor'){
        return res.status(403).send({error: true, message: 'forbidden message'})
      }
      next();
    }



    // user api
    app.get('/students', verifyJWT, verifyAdmin, async(req, res)=>{
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

    // admin get
    app.get('/students/admin/:email', verifyJWT, async(req, res)=>{
      const email = req.params.email;
      if(req.decoded.email !== email){
        res.send({admin: false})
      }
      const query = {email: email}
      const user = await studentsCollection.findOne(query);
      const result = {admin: user?.role === 'admin'}
      res.send(result)
    })
    // instructor get
    app.get('/students/instructor/:email', verifyJWT, async(req, res)=>{
      const email = req.params.email;
      if(req.decoded.email !== email){
        res.send({instructor: false})
      }
      const query = {email: email}
      const user = await studentsCollection.findOne(query);
      const result = {instructor: user?.role === 'instructor'}
      res.send(result)
    })

    // updated admin 
    app.patch('/students/admin/:id', async(req, res)=>{
      const id = req.params.id;
      console.log(id);
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
      console.log(id);
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

    app.delete('/classes/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await classesCollection.deleteOne(query);
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

    // classes api post and get

    // app.get('/classes/:id', async (req, res) => {
    //   const id = req.params.id;
    //   console.log(id);
    //   let query = {};
    //   if (req.query?.instructorEmail) {
    //     query = { instructorEmail: req.query.email }
    //     console.log(query);
    //   }
    //   const result = await classesCollection.find(query).toArray();
    //   res.send(result);
    //   // .limit(20).sort({ sub_category: 1 })
    // })

    app.post('/classes',  async (req, res) => {
      const newClass = req.body;
      console.log(newClass);
      const result = await classesCollection.insertOne(newClass)
      res.send(result);
    })


    // cart collection apis
    app.get('/carts', verifyJWT, async (req, res) => {
      const email = req.query.email;
      console.log(email);
      if (!email) {
        res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if(email !== decodedEmail){
        return res.status(403).send({error: true, message: 'forbidden access'})
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

    // payment
    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // payment api
    app.get('/payments/student',   async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    });
    app.post('/payments', verifyJWT, async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);

      const query = { _id: { $in: payment.cartItems.map(id => new ObjectId(id)) } }
      const deleteResult = await cartCollection.deleteMany(query)

      res.send({ insertResult, deleteResult });
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