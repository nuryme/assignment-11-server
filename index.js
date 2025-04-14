require('dotenv').config()
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const app = express()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



app.use(cors({
    origin: ['http://localhost:5173', 'https://whereisit-where.netlify.app'],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.428x9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token

    if (!token) {
        return res.status(401).send({ message: 'Unauthorized access' })

    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized access' })
        }

        req.user = decoded

        next()
    }
    )
}



async function run() {
    try {
        const itemCollection = client.db('whereIsIt').collection('items')
        const recoverCollection = client.db('whereIsIt').collection('recover')


        app.post('/jwt', async (req, res) => {
            const user = req.body

            const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '5h' })
            // console.log(token)

            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
                })
                .send({ success: true })
        }
        )
        app.get('/logout', async (req, res) => {
            res
                .clearCookie('token', {
                    maxAge: 0,
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
                })
                .send({ success: true })
        }
        )


        app.get('/items', async (req, res) => {
            const all = req.query.all
            const search = req.query.search
            // console.log(search)
            let option = {}

            if (search && search.trim() !== '') {
                option = { title: { $regex: search, $options: 'i' } }
            }

            const result = all ? await itemCollection.find(option).toArray() : await itemCollection.find().limit(6).toArray()

            res.send(result)
        }
        )
        app.post('/items', verifyToken, async (req, res) => {
            const itemData = req.body
            const result = await itemCollection.insertOne(itemData)
            res.send(result)
        }
        )
        app.get('/item/:id', verifyToken, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await itemCollection.findOne(query)
            res.send(result)

        }
        )
        app.get('/items/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const decodeEmail = req.user?.email

            if(email !== decodeEmail) {
                return res.status(401).send({message: 'Unauthorized access'})
            }
            
            const query = { authorEmail: email }
            const result = await itemCollection.find(query).toArray()
            res.send(result)
        }
        )
        app.patch('/item/:id', verifyToken, async (req, res) => {
            const id = req.params.id
            const data = req.body
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: data
            }
            const options = { upsert: true }

            const result = await itemCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        }
        )
        app.delete('/item/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await itemCollection.deleteOne(query)
            res.send(result)
        }
        )


        app.post('/recovery', async (req, res) => {
            const data = req.body
            const query = { _id: new ObjectId(data.recoverId) }
            const updateDoc = {
                $set: { status: 'Recovered' }
            }
            const result = await recoverCollection.insertOne(data)
            const updateStatus = await itemCollection.updateOne(query, updateDoc)

            // console.log(updateStatus)

            res.send(result)
        }
        )
        app.get('/recovery/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const decodeEmail = req.user?.email

            if(email !== decodeEmail) {
                return res.status(401).send({message: 'Unauthorized access'})
            }


            const query = { recovererEmail: email }
            const result = await recoverCollection.find(query).toArray()
            res.send(result)
        }
        )





        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Milestone 11 Assignment')
}
)

app.listen(port, () => {
    console.log(`assignment running on: ${port}`)
}
)
