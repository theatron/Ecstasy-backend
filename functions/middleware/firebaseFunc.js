var admin = require("firebase-admin");

var serviceAccount = require("../path/Ecstasy/theatronfinal-firebase-adminsdk-b3s0e-39afec9164.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://theatronfinal.firebaseio.com"
});

var db = admin.database();

module.exports = {
    admin,
    db,
    serviceAccount,
    
}

