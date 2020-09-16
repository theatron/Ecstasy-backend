//Authorization Middleware

const firebase = require('./firebaseFunc.js');


const auth = async (req, res, next) => {
    try {
        const uid = await req.header('Authorization').replace('Bearer ', '');
        const user = await firebase.admin.auth().getUser(uid);

        req.user = user;

        if (!user) {
            throw new Error('User not found');
        }

        req.user = user

        next()
    } catch (e) {
        res.status(401).send({ error: 'Please authenticate.' })
    }
}

module.exports = auth