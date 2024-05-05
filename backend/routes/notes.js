const express = require('express');
var fetchuser = require("../middleware/fetchuser")
const Note = require('../models/Note')
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Route 1 : Get all the notes using : GET "api/notes/getuser" . Login required
router.get('/fetchallnotes', fetchuser, async (req, res) => {

    try {
        const notes = await Note.find({ user: req.user.id });
        res.json(notes);
    }
    catch (error) {
        console.log("An Error has occured");
        res.status(500).send("Internal server error");
    }
})


// Route 2 : Add a new note using : POST "api/notes/addnote" . No Login required
router.post('/addnote', fetchuser,
    [
        body('title', 'Enter a valid title').isLength({ min: 3 }),
        body('description', 'Description must be atleast 5 words').isLength({ min: 3 }),
    ],
    async (req, res) => {
        try {
            const { title, description, tag } = req.body;
            const result = validationResult(req);
            if (!result.isEmpty()) {
                return res.status(400).json({ error: result.array() });
            }
            const note = await Note.create({
                title,
                description,
                tag,
                user: req.user.id

            })
            // Fetch the created note to include its details in the response
            const createdNote = await Note.findById(note._id); // Assuming user is populated with necessary details

            // Respond with the newly created note's details
            return res.json(createdNote);

        }
        catch (error) {
            console.log("An Error has occured");
            res.status(500).send("Internal server error");
        }
    })


// Route 3 : Update an existing note using : POST "api/notes/updatenote" . Login required

router.put('/updatenote/:id', fetchuser, async (req, res) => {
    const { title, description, tag } = req.body
    // Create a newNote object
    const newNote = {}
    //  if user is providing either title , description , tag [than only new variables would be sent to the object]
    if (title) { newNote.title = title };
    if (description) { newNote.description = description };
    if (tag) { newNote.tag = tag };

    try {
        // Find the note to be updated 
        let note = await Note.findById(req.params.id)
        if (!note) {
            return res.status(404).send("Not Found")
        }
        // check whether the authentic creator of the note is trying to update it
        // note.user.toString() returns the id of this note
        if (note.user.toString() !== req.user.id) {
            return res.status(401).send("Not allowed")
        }
        // By default, findOneAndUpdate() returns the document as it was before update was applied. If you set new: true, findOneAndUpdate() will instead give you the object after update was applied.
        note = await Note.findByIdAndUpdate(req.params.id, { $set: newNote }, { new: true })
        res.json({ note });
    }
    catch (error) {
        console.log("An Error has occured");
        res.status(500).send("Internal server error");
    }

})





// Route 4 : Delete an existing note using : POST "api/notes/deletenote" . Login required

router.delete('/deletenote/:id', fetchuser, async (req, res) => {

    try {
        // Find the note to be deleted 
        let note = await Note.findById(req.params.id)
        if (!note) {
            return res.status(404).send("Not Found")
        }
        // check whether the authentic creator of the note is trying to delete it
        // note.user.toString() returns the id of this note
        if (note.user.toString() !== req.user.id) {
            return res.status(401).send("Not allowed")
        }
        // By default, findOneAndUpdate() returns the document as it was before update was applied. If you set new: true, findOneAndUpdate() will instead give you the object after update was applied.
        note = await Note.findByIdAndDelete(req.params.id)
        res.json({ "Success": "Note has been deleted", note: note });
    } catch (error) {
        console.log("An Error has occured"); 
        return res.status(500).send("Internal server error")
    }

})

module.exports = router;