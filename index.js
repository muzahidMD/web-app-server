const express = require('express')
const cors = require('cors');
var jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000

app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://bikers-admin:btXzGf1pxx5dS3Mf@cluster0.14vvvov.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' })
    };
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
};


async function run() {
    try {
        await client.connect();
        const productCollection = client.db("bikers-budget").collection("products");
        const orderCollection = client.db("bikers-budget").collection("orders");
        const userCollection = client.db("bikers-budget").collection("users");

        app.get('/product', async (req, res) => {
            const query = {};
            const products = await productCollection.find(query).toArray();
            res.send(products);
        });

        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        });

        app.get('/orders', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const orders = await orderCollection.find(query).toArray();
                return res.send(orders);
            }
            else {
                return res.status(403).send({ message: 'Forbidden access' })
            }

        });

        app.get('/users', verifyJWT, async (req, res) => {
            const orders = await userCollection.find().toArray();
            res.send(orders);
        });

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });
        });

        app.put('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                }
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else {
                res.status(403).send({ message: 'Forbidden' })
            }

        });

        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, 'ef371bcf50c7b354b4604549292283ffbc220986b99cac51f4e36885322a4899ff05474fc9cfcb75642c5b549b63e22c90f34680eaa55582b7c4f9b8282541a7', { expiresIn: '1h' });
            res.send({ result, token });
        });

        app.post('/orders', async (req, res) => {
            const orders = req.body;
            const result = await orderCollection.insertOne(orders);
            res.send(result);
        });
    }
    finally { }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello to Bikers Budget!')
});

app.listen(port, () => {
    console.log(`Bikers Budget listening on port ${port}`)
});
