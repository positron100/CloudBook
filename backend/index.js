require('dotenv').config();
const connectToMongo = require('./db');
const express = require('express');
const url = process.env.url;
var cors = require('cors');
connectToMongo();

const app = express();
app.use(cors())
app.use(express.json());

// Available Routes
app.use('/api/auth',require('./routes/auth'));
app.use('/api/notes',require('./routes/notes'));

app.get('/',(req,res)=>{
    res.end('Hello World');
})

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`CloudBook backend running successfully at ${url || `http://localhost:${PORT}`}`);
});
