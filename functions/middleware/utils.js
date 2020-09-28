
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
        
        const newRef = userRef.child(String(count))
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

        const newRef = friendRef.child(String(count))
        newRef.set(body)
    })

    return friend
}

async function acceptFriendRequest(userIdentifier, friendIdentifier) {
    const userBasic = firebase.admin.database().ref().child("USER").child(userIdentifier)
    const user = userBasic.child("friendrns")
    user.orderByChild('id').equalTo(friendIdentifier).once('child_added', function(snapshot) {
        const userFriend = userBasic.child('friends')
        var body = snapshot.val()
        delete body.type
        userFriend.once('value').then(snapshot => {
            const count = snapshot.hasChildren() ? snapshot.numChildren() : 0
            userFriend.child(String(count)).set(body)
        })

        snapshot.ref.remove()
    })

    const friendBasic = firebase.admin.database().ref().child("USER").child(friendIdentifier)
    const friend = friendBasic.child("friendrns")
    friend.orderByChild('id').equalTo(userIdentifier).once('child_added', function(snapshot) {
        const userFriend = friendBasic.child('friends')
        var body = snapshot.val()
        delete body.type
        userFriend.once('value').then(snapshot => {
            const count = snapshot.hasChildren() ? snapshot.numChildren() : 0
            userFriend.child(String(count)).set(body)
        })

        snapshot.ref.remove()
    })
}

module.exports = {
    loadUser: loadUser,
    loadUsers: loadUsers,
    sendFriendRequest: sendFriendRequest,
    acceptFriendRequest: acceptFriendRequest
};
