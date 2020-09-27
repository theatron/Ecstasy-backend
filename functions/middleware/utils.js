
const firebase = require('./firebaseFunc.js');

async function loadUser(identifier) {
    const database = firebase.admin.database()
    const ref = database.ref().child("USER").child(identifier)
    
    const user = await ref.once('value', snapshot => { return snapshot.exportVal() })
    return user
}

async function loadUsers(identifiers) {
    var users = []
    
    for (var index in identifiers) {
        const user = await loadUser(identifiers[index])
        users.push(user)
    }

    return users
}

module.exports = {
    loadUser: loadUser,
    loadUsers: loadUsers
};
