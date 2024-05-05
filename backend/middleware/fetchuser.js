// middleware : function which is called when there are requests being sent onto any login required routes

const jwt = require('jsonwebtoken');
const JWT_SECRET = "TokenSignature";

const fetchuser = (req, res, next) => {
    // Get the user from the JWT token and add id to the req object
    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({ error: "please authenticate using a valid token" });
    }
    try {
        const data = jwt.verify(token, JWT_SECRET);
        req.user = data.user;
        next();
    } catch (error) {
        res.status(401).send({ error: "please authenticate using a valid token" });
    }

}



module.exports = fetchuser;