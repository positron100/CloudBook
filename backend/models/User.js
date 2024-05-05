const mongoose = require('mongoose');
const { Schema } = mongoose ; 

// Defining Schema

const UserSchema = mongoose.Schema({
    name : {
        type : String ,
        required : true
        // required : ensures that the column cannot be left empty 
    } ,
    email : {
        type : String , 
        required : true ,
        unique : true
        // unique : ensures that the each value in the field is unique
    } ,
    password : String ,
    date : {
        type : Date ,
        default : Date.now
    },

})


// Exporting the model
const User = mongoose.model('user',UserSchema);
module.exports = User;