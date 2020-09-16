//Authorization Middleware

const firebase = require('./firebaseFunc.js');


const auth = async (req, res, next) => {
    try {
        const token = await firebase.admin.auth().verifyIdToken(req.header.AccessToken);
        const uid = await token.uid;
        const user = firebase.admin.auth().getUser(uid)

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