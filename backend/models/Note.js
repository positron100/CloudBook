const mongoose = require('mongoose');
// Schema have to be defined
const { Schema } = mongoose ; 
// Defining Schema

const NoteSchema = new Schema({
    user : {
        // acts as a foreign key  [This particular associates to which user]
        type : mongoose.Schema.Types.ObjectId,
        // model which is to be associated to be foreign key
        ref : 'user'
    } ,
    title : {
        type : String ,
        required : true
        // required : ensures that the column cannot be left empty 
    } ,
    description : {
        type : String , 
        required : true 
    } ,
    tag : {
        type : String ,
        default : 'General'
    } ,
    date : {
        type : Date ,
        default : Date.now
    },
})

// Exporting the model

module.exports = mongoose.model('note',NoteSchema);