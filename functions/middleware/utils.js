
const { userRecordConstructor } = require('firebase-functions/lib/providers/auth');
const firebase = require('./firebaseFunc.js');


async function loadUser(identifier) {
    const database = firebase.admin.database()
    const ref = database.ref().child("USER").child(identifier)
    
    var user = await ref.once('value', snapshot => { return snapshot.val() })
    user = user.toJSON()
    console.log(user.name)
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

async function denyFriendRequest(userIdentifier, friendIdentifier) {
    const userBasic = firebase.admin.database().ref().child("USER").child(userIdentifier)
    const user = userBasic.child("friendrns")
    user.orderByChild('id').equalTo(friendIdentifier).once('child_added', function(snapshot) {
        snapshot.ref.remove()
    })

    const friendBasic = firebase.admin.database().ref().child("USER").child(friendIdentifier)
    const friend = friendBasic.child("friendrns")
    friend.orderByChild('id').equalTo(userIdentifier).once('child_added', function(snapshot) {
        snapshot.ref.remove()
    })
}

async function usersFromNumber(identifiers, number) {
    const ref = firebase.admin.database().ref().child('USER').orderByChild('phonenumber').equalTo(number)

    const snapshot = await ref.once('value')
    var newUsers = []
    snapshot.forEach(childSnapshot => {
        var customUser = childSnapshot.toJSON()
             customUser.id = childSnapshot.key
            
             if (identifiers.includes(customUser.id) == false) {
                 newUsers.push(customUser)
             }
    })
    
    return newUsers
}

async function usersFromNumbers(identifiers, numbers) {
    var users = []
    for (var number in numbers) {
        const friends = await usersFromNumber(identifiers, numbers[number])
        friends.forEach(friend => {
            
        })
        if (friends.toJSON !== null) {
            friends.forEach(friend => { users.push(friend) })
        }
        
    }
    return users
}

async function friendRequests(identifier) {
    var ref = firebase.admin.database().ref().child("USER").child(identifier).child("friendrns")
    if (ref.exists == false) {
        return []
    }
    const snapshot = await ref.once('value')
    
    return snapshot.val()
}

async function friendsIdentifier(identifier) {
    const ref = firebase.admin.database().ref().child("USER").child(identifier).child("friends")
    if (ref.exists == false) {
        return []
    }
    const snapshot = await ref.once('value')

    const friends = snapshot.val()
    if (friends == undefined) {
        return []
    }
    //Extract friends' identifier
    const identifiers = friends.map(value => value.id)
    return identifiers
}

async function cannotBeFriends(identifier) {
    var requests = await friendRequests(identifier)
    var friends = await friendsIdentifier(identifier)
    if (requests == undefined) {
        requests = []
    }
    if (friends == undefined) {
        friends = []
    }
    requests = requests.map(request => request.id)
    friends.forEach(friend => {
        requests.push(friend)
    })
    requests.push(identifier)
    return requests
}

async function deleteFriend(userIdentifier, friendIdentifier) {
    const ref = firebase.admin.database().ref().child("USER")
    const userRef = ref.child(userIdentifier).child("friends").orderByChild('id').equalTo(friendIdentifier)
    const userSnapshot = await userRef.once('child_added')
    if (userSnapshot.exists) {
        userSnapshot.ref.remove()
    }

    const friendRef = ref.child(friendIdentifier).child("friends").orderByChild('id').equalTo(userIdentifier)
    const friendSnapshot = await friendRef.once('child_added')
    if (friendSnapshot.exists) {
        friendSnapshot.ref.remove()
    }
    
}

module.exports = {
    loadUser: loadUser,
    loadUsers: loadUsers,
    sendFriendRequest: sendFriendRequest,
    acceptFriendRequest: acceptFriendRequest,
    denyFriendRequest: denyFriendRequest,
    usersFromNumber: usersFromNumber,
    usersFromNumbers: usersFromNumbers,
    friendRequests: friendRequests,
    cannotBeFriends: cannotBeFriends,
    deleteFriend: deleteFriend
};
