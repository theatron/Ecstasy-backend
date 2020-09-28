
const { userRecordConstructor } = require('firebase-functions/lib/providers/auth');
const firebase = require('./firebaseFunc.js');

async function loadUser(identifier) {
    const database = firebase.admin.database()
    const ref = database.ref().child("USER").child(identifier)
    
    var user = await ref.once('value', snapshot => { return snapshot.val() })
    user = user.toJSON()
    user.id = ref.key
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

async function sendFriendRequest(userIdentifier, friendIdentifier) {
    
    const user = await loadUser(userIdentifier)
    const friend = await loadUser(friendIdentifier)
    console.log(user)
    const userRef = firebase.admin.database().ref().child("USER").child(user.id).child("friendrns")
    userRef.once('value').then(snapshot => {
        const count = snapshot.hasChildren() ? snapshot.numChildren() : 0
        const body = {
            'id': friendIdentifier,
            'name': friend.name,
            'phonenumber': friend.phonenumber,
            'photo': friend.photourl,
            'type': 'S'
        }
        console.log(body)
        const newRef = userRef.child(String(count))//.push()
        //newRef.push()
        newRef.set(body)
    })

    const friendRef = firebase.admin.database().ref().child("USER").child(friend.id).child("friendrns")
    friendRef.once('value').then(snapshot => {
        const count = snapshot.hasChildren() ? snapshot.numChildren() : 0
        const body = {
            'id': userIdentifier,
            'name': user.name,
            'phonenumber': user.phonenumber,
            'photo': user.photourl,
            'type': 'R'
        }

        const newRef = friendRef.child(String(count))//.push()
        //newRef.push()
        newRef.set(body)
    })

    return friend
}

module.exports = {
    loadUser: loadUser,
    loadUsers: loadUsers,
    sendFriendRequest: sendFriendRequest
};
