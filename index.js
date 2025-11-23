const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const stripe = require("stripe")(`${process.env.STRIPE_SECRET}`);

const port = process.env.PORT || 3000;
//Middlewere
app.use(express.json());
app.use(cors());

//mongodb uri
const uri = process.env.VITE_MONGO_URI;

// Create a MongoClient with a MongoClinentOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Zap Shift Server is Running");
});

// mongodb connector with try catch
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("zap-shift-db");
    const percelCollection = db.collection("percel");

    //percel api
    app.get("/percel", async (req, res) => {
      const query = {};
      const { email } = req.query;
      if (email) {
        query.senderEmail = email;
      }
      const option = { sort: { createdAt: -1 } };
      const result = await percelCollection.find(query, option).toArray();
      res.send(result);
    });
    //get percel data with their id
    app.get("/percel/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await percelCollection.findOne(query);
      res.send(result);
    });

    app.post("/percel", async (req, res) => {
      const query = req.body;
      query.createdAt = new Date();

      const result = await percelCollection.insertOne(query);
      res.send(result);
    });

    app.delete("/percel/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await percelCollection.deleteOne(query);
      res.send(result);
    });

    //peyment getway related APIs
    app.post("/create-checkout-session", async (req, res) => {
      const paymentInfo = req.body;
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            // Provide the exact Price ID (for example, price_1234) of the product you want to sell
            price_data: {
              currency: "USD",
              product_data: {
                name: paymentInfo.parcelName,
              },
              unit_amount: 1500,
            },
            quantity: 1,
          },
        ],
        customer_email: paymentInfo.senderEmail,
        mode: "payment",
        success_url: `${process.env.SITE_PAYMENT_DOMAIN}/dashboard/payment-success`,
      });
    });

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

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
