const express = require('express');
const User = require('../models/User.js')
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetchuser = require('../middleware/fetchuser')

const JWT_SECRET = "TokenSignature";
// Route 1 :  Create a user using : POST "/api/auth/createuser" [do not need authentication]
router.post('/createuser',
    [
        body('name').isLength({ min: 3 }),
        body('email', 'Enter a valid mail').isEmail(),
        body('password').isLength({ min: 5 }),
    ],
    async (req, res) => {
        let status = false ; 
        // on error return status(400) and the errors
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return res.status(400).json({ error: result.array() });
        }
        try {
            // check whether the user with this email exists already 
            let user = await User.findOne({
                email: req.body.email
            })
            if (user) {
                return res.status(400).json({status, error: "Sorry a user with this Email already exists" });
            }
            // generating the password hash
            const salt = await bcrypt.genSalt(10);
            setpass = await bcrypt.hash(req.body.password, salt);
            // create a new document in users collection
            user = await User.create({
                name: req.body.name,
                email: req.body.email,
                password: setpass,
            })
            const data = {
                user: {
                    id: user.id
                }
            }
            const authToken = jwt.sign(data, JWT_SECRET);
            status=true
            res.json({status, authToken });
            // catching errors
        } catch (error) {
            console.log("An Error has occured");
            res.status(500).send("Internal server error");
        }



    })

//  Route 2 : Authenticate the user using : POST "/api/auth/login" [No login needed]
router.post('/login',
    [
        body('email', 'Enter a valid mail').isEmail(),
        body('password' , 'password cannot be blank').exists(),
    ],
    async (req, res) => {
        let status = false;
        // on error return status(400) and the errors
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return res.status(400).json({ error: result.array() });
        }

        const {email,password} = req.body;
        
        try {
            let user = await User.findOne({email});
            // checking if the user exists or not 
            if(!user)
            {

                return res.status(400).json({status , error : "please try to login with correct credentials"})
            }
            // commparing the entered password and the storred password
            const passwordCompare = await bcrypt.compare(password , user.password);
            if(!passwordCompare)
            {
                return res.status(400).json({status , error : "please try to login with correct credentials"})
            }
            const data = {
                user : {
                    id : user.id
                }
            }
            const authToken = jwt.sign(data, JWT_SECRET);
            status = true;
            return res.json({status , authToken });
        } catch (error) {
            console.log('some error has occured');
            res.status(500).send('Internal server error')
        }
    })



// Route 3 : Get loggedin user details : POST "/api/auth/getuser" [do need authentication]
router.post('/getuser', fetchuser ,  async (req,res)=>{
try{
    userId = req.user.id;
    const user = await User.findById(userId).select('-password')
    res.send(user);
}
catch(error){
    console.log('Some error has occured');
    res.status(500).send('Internal server error');
}
})
module.exports = router;