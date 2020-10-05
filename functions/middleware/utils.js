
const { userRecordConstructor, user } = require('firebase-functions/lib/providers/auth');
const firebase = require('./firebaseFunc.js');
const { sendNotification } = require('./notifications');


class Utils {
    static async loadUser(identifier) {
        const database = firebase.admin.database()
        const ref = database.ref().child("USER").child(identifier)
        
        var user = await ref.once('value', snapshot => { return snapshot.val() })
        user = user.toJSON()
       
        user.id = ref.key
        return user
    }
    
    static async loadUsers(identifiers) {
        var users = []
        
        for (var index in identifiers) {
            const user = await Utils.loadUser(identifiers[index])
            users.push(user)
        }
    
        return users
    }
    
    static async sendFriendRequest(userIdentifier, friendIdentifier) {
        
        const user = await Utils.loadUser(userIdentifier)
        const friend = await Utils.loadUser(friendIdentifier)
        
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

        sendNotification('Friend request', 'You got a new friend request from ' + user.name, friendIdentifier, user.photourl)
    
        return friend
    }
    
    static async acceptFriendRequest(userIdentifier, friendIdentifier) {
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
    
    static async denyFriendRequest(userIdentifier, friendIdentifier) {
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
    
    static async usersFromNumber(identifiers, number) {
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
    
    static async usersFromNumbers(identifiers, numbers) {
        var users = []
        for (var number in numbers) {
            const friends = await Utils.usersFromNumber(identifiers, numbers[number])
            friends.forEach(friend => {
                
            })
            if (friends.toJSON !== null) {
                friends.forEach(friend => { users.push(friend) })
            }
            
        }
        return users
    }
    
    static async friendRequests(identifier) {
        var ref = firebase.admin.database().ref().child("USER").child(identifier).child("friendrns")
        if (ref.exists == false) {
            return []
        }
        const snapshot = await ref.once('value')
        
        return snapshot.val()
    }
    
    static async friendsIdentifier(identifier) {
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
    
    static async cannotBeFriends(identifier) {
        var requests = await Utils.friendRequests(identifier)
        var friends = await Utils.friendsIdentifier(identifier)
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
    
    static async deleteFriend(userIdentifier, friendIdentifier) {
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
    
    static async videosFromUser(userIdentifier) {
        const ref = firebase.admin.database().ref().child("USER").child(userIdentifier).child('videolist')
        if (ref.exists == false) {
            return []
        } 
        const snapshot = await ref.once('value')
        
        return snapshot.val()
    }
    
    static async friendVideos(userIdentifier) {
        var videos = []
        const loadedFriendsIdentifier = await Utils.friendsIdentifier(userIdentifier)
        
        for (var index in loadedFriendsIdentifier) {
            const newVideos = await Utils.videosFromUser(loadedFriendsIdentifier[index])
            newVideos.forEach(video => {
                videos.push(video)
            })
        }
    
        return videos
    }
    
    static async loadThumbnail(userIdentifier) {
        var videos = []
        const friendLoadedVideos = await Utils.friendVideos(userIdentifier)
        friendLoadedVideos.forEach(video => {
            videos.push(video)
        })
    
        return videos
    }
    
    static async likeVideo(userIdentifier, videoOwner, videoNumber) {
        
        const userRef = firebase.admin.database().ref().child("USER").child(videoOwner)
        const likeDislike = userRef.child('likedislike').child(String(videoNumber)).child('likedby')
        likeDislike.push({"id": userIdentifier})
    
        const likeRef = userRef.child('videolist').child(String(videoNumber))
        const snapshot = await likeRef.once('value')
        var likes = Number(snapshot.toJSON().likes)
        if (likes == undefined) {
            likes = "0"
        }
        likeRef.update({"likes": String(likes + 1)})
    }
    
    static async deleteVideoLike(userIdentifier, videoOwner, videoNumber) {
        
        const userRef = firebase.admin.database().ref().child("USER").child(videoOwner)
        const likeDislike = userRef.child('likedislike').child(String(videoNumber)).child('likedby').orderByChild('id').equalTo(userIdentifier)
        const likeDislikeSnapshot = await likeDislike.once('child_added')
        likeDislikeSnapshot.ref.remove()
    
        const likeRef = userRef.child('videolist').child(String(videoNumber))
        const snapshot = await likeRef.once('value')
        var likes = Number(snapshot.toJSON().likes)
        if (likes == undefined) {
            likes = "1"
        }
        likeRef.update({"likes": String(likes - 1)})
    }
    
    static async dislikeVideo(userIdentifier, videoOwner, videoNumber) {
        
        const userRef = firebase.admin.database().ref().child("USER").child(videoOwner)
        const likeDislike = userRef.child('likedislike').child(String(videoNumber)).child('dislikedby')
        likeDislike.push({"id": userIdentifier})
    
        const dislikeRef = userRef.child('videolist').child(String(videoNumber))
        const snapshot = await dislikeRef.once('value')
        var dislikes = Number(snapshot.toJSON().dislikes)
        if (dislikes == undefined) {
            dislikes = "0"
        }
        dislikeRef.update({"dislikes": String(dislikes + 1)})
    }
    
    static async deleteVideoDislike(userIdentifier, videoOwner, videoNumber) {
        
        const userRef = firebase.admin.database().ref().child("USER").child(videoOwner)
        const likeDislike = userRef.child('likedislike').child(String(videoNumber)).child('dislikedby').orderByChild('id').equalTo(userIdentifier)
        const likeDislikeSnapshot = await likeDislike.once('child_added')
        likeDislikeSnapshot.ref.remove()
    
        const dislikeRef = userRef.child('videolist').child(String(videoNumber))
        const snapshot = await dislikeRef.once('value')
        var dislikes = Number(snapshot.toJSON().dislikes)
        if (dislikes == undefined) {
            dislikes = "1"
        }
        dislikeRef.update({"dislikes": String(dislikes - 1)})
    }
    
    static async likesVideo(userIdentifier, videoOwner, videoNumber) {
        const ref = firebase.admin.database().ref().child('USER').child(videoOwner).child("likedislike").child(String(videoNumber)).child('likedby')
        if (ref.exists == false) {
            return false
        }
        const snapshot = await ref.once('value')
        const values = snapshot.toJSON()
    
        for (childSnapshot in values) {
            
            if (values[childSnapshot].id) {
                return true
            }
        }
        return false
    
    }
    
    static async dislikesVideo(userIdentifier, videoOwner, videoNumber) {
        const ref = firebase.admin.database().ref().child('USER').child(videoOwner).child("likedislike").child(String(videoNumber)).child('dislikedby')
        if (ref.exists == false) {
            return false
        }
        const snapshot = await ref.once('value')
        const values = snapshot.toJSON()
    
        for (childSnapshot in values) {
            
            if (values[childSnapshot].id) {
                return true
            }
        }
        return false
    
    }

    static async usersFromName(name) {
        var users = []
        const ref = firebase.admin.database().ref('USER').orderByChild('name').startAt(name).endAt(name + '\uf8ff')
        
        const snapshot = await ref.once('value')
        
        snapshot.forEach(childSnapshot => {
            var user = childSnapshot.toJSON()
            user.id = childSnapshot.key
            users.push(user)
        })
        return users
    }

    static async admire(userIdentifier, admireIdentifier) {
        const globalUserRef = firebase.admin.database().ref('USER')
        const userRef = globalUserRef.child(userIdentifier).child('admiring')
        const snapshot = await userRef.once('value')
        userRef.child(String(snapshot.numChildren())).set({'id': admireIdentifier})

        const admireRef = globalUserRef.child(admireIdentifier)
        const admireSnapshot = await admireRef.once('value')
        var admireCount = admireSnapshot.toJSON().admirerscount
        if (admireCount == undefined) {
            admireCount = '0'
        }
        admireRef.update({'admirerscount': String(Number(admireCount) + 1)})

        const admiringRef = admireRef.child('admirers')
        const admiringSnapshot = await admiringRef.once('value')
        admiringRef.child(String(admiringSnapshot.numChildren())).set({'id': userIdentifier})
    }

    static async removeAdmire(userIdentifier, admireIdentifier) {
        const ref = firebase.admin.database().ref().child("USER")
        const admiringRef = ref.child(userIdentifier).child("admiring").orderByChild('id').equalTo(admireIdentifier)
        const admiringSnapshot = await admiringRef.once('child_added')
        if (admiringSnapshot.exists) {
            admiringSnapshot.ref.remove()
        }
    
        const admirersRef = ref.child(admireIdentifier).child("admirers").orderByChild('id').equalTo(userIdentifier)
        const admirersSnapshot = await admirersRef.once('child_added')
        if (admirersSnapshot.exists) {
            admirersSnapshot.ref.remove()
        }

        const admiringCountRef = ref.child(admireIdentifier)
        const countSnapshot = await admiringCountRef.once('value')
        var count = Number(countSnapshot.toJSON().admirerscount)
        if (count == undefined) {
            count = "1"
        }
        admiringCountRef.update({"admirerscount": String(count - 1)})
    }

    static async videosFromName(title, currentUser) {
        const name = title.toLowerCase()
        var videos = []
        const snapshot = await firebase.admin.database().ref('USER').once('value')
        snapshot.forEach(snapshot => {
            const videolist = snapshot.toJSON().videolist
            if (videolist != undefined) {
                for (var element in videolist) {
                    const video = videolist[element]
                    const title = video.title.toLowerCase()
                    if (title.startsWith(name)) {
                        videos.push(video)
                    }
                }
                
            }
            
        })
        //.orderByChild('videolist').startAt(name).endAt(name + '\uf8ff')
        
    
        return videos
    }

    static async login(id, type, name, photourl) {
        const ref = firebase.admin.database().ref('USER').child(id)
        const snapshot = await ref.once('value')
        if (snapshot.exists() && snapshot.hasChildren()) {
            Utils.updateUser(id, type)
        } else {
            Utils.createUser(id, type, name, photourl)
        }
    }

    static async createUser(id, type, name, photourl) {

        const ref = firebase.admin.database().ref('USER').child(id)
        ref.set({
            'admirerscount': '0',
            'followerscount': '0',
            'name': name,
            'phonenumber': '',
            'photourl': photourl,
            'sharescount': '0',
            'type': type
          })
      
          const secondRef = firebase.admin.database().ref('ALLUSER')
          const snapshot = await secondRef.once('value')
          const number = String(snapshot.numChildren())
          secondRef.child(number).set({
            'id': id,
            'name': name,
            'phonenumber': '',
            'photo': photourl
          })
    }

    static async updateUser(id, type) {
        const ref = firebase.admin.database().ref('USER').child(id)
        ref.update({'type': type})
    }

}

module.exports = { Utils }
