const mongoose = require('mongoose');
// const mongoURI = "mongodb://localhost:27017/cloudbook";
// mongoURI for atlas
const mongoURI = "mongodb+srv://mukulnegi:RTd%24%2EiwhwG%235DYi@cluster0.llxmm.mongodb.net/cloudbook?retryWrites=true&w=majority&appName=Cluster0";

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