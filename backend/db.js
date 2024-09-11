const mongoose = require('mongoose');
const mongoURI = "mongodb://localhost:27017/cloudbook";

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