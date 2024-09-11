require('dotenv').config();
const mongoose = require('mongoose');
const database = process.env.database;
const mongoURI = database;

const connectToMongo = ()=>{
    let connection = mongoose.connect(mongoURI)
    if(connection)
    {
        console.log('connection estabilished')
    }
    else{
        console.log('error');
    }
}

module.exports=connectToMongo