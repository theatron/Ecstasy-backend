var admin = require("firebase-admin");

var serviceAccount = require("../path/Ecstasy/service-account-key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://theatronfinal.firebaseio.com",
    storageBucket:"theatronfinal.appspot.com"
});

var db = admin.database();
var storage = admin.storage()

module.exports = {
    admin,
    db,
    storage,
    serviceAccount,
    
}

