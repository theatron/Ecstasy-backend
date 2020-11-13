
const { userRecordConstructor, user } = require('firebase-functions/lib/providers/auth');
const firebase = require('./firebaseFunc.js');
const { sendNotification, postSilentNotification } = require('./notifications');
const admin = require('firebase-admin');
var bucket = admin.storage().bucket();
const { parsePhoneNumber } = require('libphonenumber-js')
//const storage = require('firebase/storage'); 
//var storage = require('@google-cloud/storage')

const { Storage } = require('@google-cloud/storage');

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

        //sendNotification('Friend request', 'You got a new friend request from ' + user.name, friendIdentifier, user.photourl)
        postSilentNotification(friendIdentifier, 'Friend request', 'You got a new friend request from ' + user.name)
        sendNotification('Friend request', 'You got a new friend request from ' + user.name, friendIdentifier)

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

        const loadedUser = await Utils.loadUser(userIdentifier)
        postSilentNotification(friendIdentifier, 'New friend', loadedUser.name + ' has accepted your request')
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

    static async userFromUniversalNumber(number, identifier) {
        var users = []
        const defaultUsers = await Utils.usersFromNumber([identifier], number)
        defaultUsers.forEach(user => users.push(user))
        
        try {
            const nationalNumber = parsePhoneNumber(number).nationalNumber
            if (nationalNumber !== undefined) {
                var nationalFriends = await Utils.usersFromNumber([identifier], nationalNumber)
                nationalFriends.forEach(user => users.push(user))
            }
        } catch {
            console.log('error', users)
            return users
        }

        return users
    }

    static async usersFromNumbers(identifiers, numbers) {
        var users = []
        for (var number in numbers) {
            const simpleNumber = numbers[number]
            
            var friends = await Utils.usersFromNumber(identifiers, simpleNumber)
            try {
                const nationalNumber =  parsePhoneNumber(simpleNumber).nationalNumber
                if (nationalNumber !== undefined) {
                    var nationalFriends = await Utils.usersFromNumber(identifiers, nationalNumber)
                    nationalFriends.forEach(friend => {
                        if (friends.includes(friend) == false) {
                            friends.push(friend)
                        }   
                    })
                }
            } catch {
                console.log('error')
            }
            
            
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

        const basicRef = firebase.admin.database().ref().child("USER").child(identifier)
        const basicSnapshot = await basicRef.once('value')

        if (basicSnapshot.hasChild('friends') == false) {
            return []
        }

        const ref = basicRef.child("friends")
        if (ref.exists == false) {
            return []
        }

        const snapshot = await ref.once('child_added')
    
        var friends = snapshot.toJSON()
        
        if (friends == undefined || friends == null) {
            return []
        }

        friends = Array(friends)
        //Extract friends' identifier
        const identifiers = friends.map(value => value.id)
        return identifiers
    }
    
    static async cannotBeFriends(identifier) {
        var requests = await Utils.friendRequests(identifier)
        var friends = await Utils.friendsIdentifier(identifier)
        if (requests == undefined || requests == null) {
            requests = []
        }
        if (friends == undefined || friends == null) {
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
        var videos = []
        const snapshot = await ref.once('value')
        snapshot.forEach(child => {
            videos.push(child.toJSON())
        })
        return videos
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

    static async sharedVideoIdentifiers(userIdentifier) {

        var finalValues = []

        const friendIdentifiers = await Utils.friendsIdentifier(userIdentifier)

        for (var index in friendIdentifiers) {


            const userIdentifier = friendIdentifiers[index]

            const ref = firebase.admin.database().ref().child("USER").child(userIdentifier).child('sharedvideos')
            const snapshot = await ref.once('value')
            
            var values = snapshot.val()
        
            if (values == undefined || values == null) {
                values = []
                continue
            }
            finalValues.push(
                ({
                    videoOwner: values[0].videoOwner,
                    videoNumber: values[0].vnum
                })
            )
        
        }
        
        return finalValues
    }

    static async sharedVideos(userIdentifier) {
        var videos = []
        const sharedVideoIdentifiers = await Utils.sharedVideoIdentifiers(userIdentifier)
        
        for (var index in sharedVideoIdentifiers) {
            const id = sharedVideoIdentifiers[index]
           
            const newVideos = await Utils.loadSharedVideo(id.videoOwner, id.videoNumber)
            videos.push(newVideos)
        }
        return videos
    }

    static async loadSharedVideo(ownerIdentifier, vnum) {
        const ref = firebase.admin.database().ref().child("USER").child(ownerIdentifier).child('videolist').child(vnum)
        if (ref.exists == false) {
            return
        }
        
        const snapshot = await ref.once('value')
        return snapshot.toJSON()
        
    }

    static async loadAdmiringIdentifier(userIdentifier) {
        const ref = firebase.admin.database().ref('USER').child(userIdentifier).child('admiring')
        
        if (ref.exists == false) {
            return []
        }
        const snapshot = await ref.once('value')
    
        const admirings = snapshot.val()
        if (admirings == undefined || admirings == null) {
            return []
        }
        //Extract friends' identifier
        const identifiers = admirings.map(value => value.id)
        return identifiers
    }

    static async admiringVideos(userIdentifier) {
        var videos = []
        const identifier = await Utils.loadAdmiringIdentifier(userIdentifier)

        for (var index in identifier) {
            const newVideos = await Utils.videosFromUser(identifier[index])
            newVideos.forEach(video => {
                videos.push(video)
            })
        }
    
        return videos
    }
    
    static async loadThumbnail(userIdentifier) {
        var videos = []
        
        const sharedVideos = await Utils.sharedVideos(userIdentifier)
        
        //const friendLoadedVideos = await Utils.friendVideos(userIdentifier)
       
        const admiringVideos = await Utils.admiringVideos(userIdentifier)
        
        sharedVideos.forEach(video => {
            videos.push(video)
        })
        // friendLoadedVideos.forEach(video => {
        //     videos.push(video)
        // })

        admiringVideos.forEach(video => {
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
    
        for (var childSnapshot in values) {
            
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
    
        for (var childSnapshot in values) {
            
            if (values[childSnapshot].id) {
                return true
            }
        }
        return false
    
    }

    static async usersFromName(name, identifier) {
        var users = []
        const ref = firebase.admin.database().ref('USER').orderByChild('name').startAt(name).endAt(name + '\uf8ff')
        
        const snapshot = await ref.once('value')
        
        snapshot.forEach(childSnapshot => {
            var user = childSnapshot.toJSON()
            user.id = childSnapshot.key
            if (user.id !== identifier) {
                users.push(user)
            }
            
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

                    if (video !== undefined && video.title != undefined) {
                        const title = video.title.toLowerCase()
                        if (title.startsWith(name) && video.id !== currentUser) {
                            videos.push(video)
                        }   
                    }
                }
                
            }
            
        })
        //.orderByChild('videolist').startAt(name).endAt(name + '\uf8ff')
        
    
        return videos
    }

    static async videos(currentUser) {
        var videos = []
        const snapshot = await firebase.admin.database().ref('USER').once('value')
        snapshot.forEach(snapshot => {
            const videolist = snapshot.toJSON().videolist
            if (videolist != undefined) {
                for (var element in videolist) {
                    const video = videolist[element]

                    if (video !== undefined && video.title != undefined && video.id !== currentUser) {
                        videos.push(video)
                    }
                }
                
            }
            
        })
        
    
        return videos
    }

    static async login(id, type, name, photourl) {
        const ref = firebase.admin.database().ref('USER').child(id)
        const snapshot = await ref.once('value')
        if (snapshot.exists() && snapshot.hasChildren()) {
            return await Utils.updateUser(id, type)
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
            'username': name.split(' ').join('').toLowerCase(),
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
        const snapshot = await ref.once('value')
        const object = snapshot.toJSON()
        return (object.type == type)
    }

    static async shareVideo(userIdentifier, videoOwnerIdentifier, videoNumber, caption, commentIdentifier) {
        const ownerRef = firebase.admin.database().ref('USER').child(videoOwnerIdentifier)
        const sharedByRef = ownerRef.child('sharedby').child(videoNumber).child(commentIdentifier)
        sharedByRef.set(userIdentifier)

        const commentsRef = ownerRef.child('comments').child(videoNumber)
        
        commentsRef.push({
            'comments': caption,
            'dislikes': '0',
            'id': userIdentifier,
            'likes': '0'
        })

        const sharesCountRef = ownerRef.child('videolist').child(videoNumber)
        const countSnapshot = await sharesCountRef.once('value')
        const sharesCount = Number(countSnapshot.toJSON().shares)
        sharesCountRef.update({'shares': String(sharesCount + 1)})

        const userRef = firebase.admin.database().ref('USER').child(userIdentifier).child('sharedvideos')
        const userSnapshot = await userRef.once('value')
        userRef.child(String(userSnapshot.numChildren())).set({'videoOwner': videoOwnerIdentifier, 'vnum': videoNumber})
    }

    static async replyToComment(userIdentifier, videoOwnerIdentifier, videoNumber, commentIdentifier, caption) {
        const ref = firebase.admin.database().ref('USER').child(videoOwnerIdentifier).child('comments').child(videoNumber).child(commentIdentifier).child('subcomments')
        ref.push({
            'comments': caption,
            'id': userIdentifier
        })

        const comment = await firebase.admin.database().ref('USER').child(videoOwnerIdentifier).child('comments').child(videoNumber).child(commentIdentifier).once('value')
        postSilentNotification(comment.toJSON().id, 'New reply', comment.toJSON().comments)
    }

    static async likeComment(userIdentifier, videoOwner, videoNumber, commentIdentifier) {
        
        const ref = firebase.admin.database().ref('USER').child(videoOwner).child('comments').child(videoNumber).child(commentIdentifier)
        const likeDislike = ref.child('likedby')
        likeDislike.push().set({"id": userIdentifier})
    
        //const likeRef = userRef.child('videolist').child(String(videoNumber))
        const snapshot = await ref.once('value')
        var likes = Number(snapshot.toJSON().likes)
        if (likes == undefined) {
            likes = "0"
        }
        ref.update({"likes": String(likes + 1)})

        const uid = snapshot.toJSON().id
        const comments = snapshot.toJSON().comments
        postSilentNotification(uid, 'Captions like', comments)
    }
    
    static async deleteCommentLike(userIdentifier, videoOwner, videoNumber, commentIdentifier) {
        
        const ref = firebase.admin.database().ref('USER').child(videoOwner).child('comments').child(videoNumber).child(commentIdentifier)
        const likeDislike = ref.child('likedby').orderByChild('id').equalTo(userIdentifier)
        const likeDislikeSnapshot = await likeDislike.once('child_added')
        likeDislikeSnapshot.ref.remove()
    
        const snapshot = await ref.once('value')
        var likes = Number(snapshot.toJSON().likes)
        if (likes == undefined) {
            likes = "1"
        }
        ref.update({"likes": String(likes - 1)})
    }
    
    static async dislikeComment(userIdentifier, videoOwner, videoNumber, commentIdentifier) {
        
        const ref = firebase.admin.database().ref('USER').child(videoOwner).child('comments').child(videoNumber).child(commentIdentifier)
        const likeDislike = ref.child('dislikedby')
        likeDislike.push().set({"id": userIdentifier})
    
        const snapshot = await ref.once('value')
        var dislikes = Number(snapshot.toJSON().dislikes)
        if (dislikes == undefined) {
            dislikes = "0"
        }
        ref.update({"dislikes": String(dislikes + 1)})
    }
    
    static async deleteCommentDislike(userIdentifier, videoOwner, videoNumber, commentIdentifier) {
        
        const ref = firebase.admin.database().ref('USER').child(videoOwner).child('comments').child(videoNumber).child(commentIdentifier)
        const likeDislike = ref.child('dislikedby').orderByChild('id').equalTo(userIdentifier)
        const likeDislikeSnapshot = await likeDislike.once('child_added')
        likeDislikeSnapshot.ref.remove()
    
        const snapshot = await ref.once('value')
        var dislikes = Number(snapshot.toJSON().dislikes)
        if (dislikes == undefined) {
            dislikes = "1"
        }
        ref.update({"dislikes": String(dislikes - 1)})
    }
    
    static async likesComment(userIdentifier, videoOwner, videoNumber, commentIdentifier) {
        const ref = firebase.admin.database().ref('USER').child(videoOwner).child('comments').child(videoNumber).child(commentIdentifier).child('likedby')
        if (ref.exists == false) {
            return false
        }
        const snapshot = await ref.once('value')
        const values = snapshot.val()

        for (var index in values) {
            const child = values[index]

            if (child.id == userIdentifier) {
                return true
            }
        }
        return false
    
    }
    
    static async dislikesComment(userIdentifier, videoOwner, videoNumber, commentIdentifier) {
        const ref = firebase.admin.database().ref('USER').child(videoOwner).child('comments').child(videoNumber).child(commentIdentifier).child('dislikedby')
        if (ref.exists == false) {
            return false
        }
        const snapshot = await ref.once('value')
        const values = snapshot.val()
    
        for (var index in values) {
            const child = values[index]

            if (child.id == userIdentifier) {
                return true
            }
        }
        return false
    
    }

    static async loadVideoComments(videoOwner, videoNumber) {
        const ref = firebase.admin.database().ref('USER').child(videoOwner).child('comments').child(videoNumber)
        const snapshot = await ref.once('value')
        var comments = []
        snapshot.forEach(child => {
            var comment = child.toJSON()
            comment.commentID = child.key

            comments.push(comment)
        })
        return comments
    }
static async updateImage(req) {

    const BusBoy = require("busboy");
    const path = require("path");
    const os = require("os");
    const fs = require("fs");

    const busboy = new BusBoy({ headers: req.headers });

    let imageToBeUploaded = {};
    let imageFileName;
  
    let uid = req.user.uid;
    let generatedToken = Math.random().toString(36).substring(7);


    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
        console.log(fieldname, file, filename, encoding, mimetype);
        if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
            return "Wrong file type submitted";
        }
    
        const imageExtension = filename.split(".")[filename.split(".").length - 1];
   
        imageFileName = `${uid}.${imageExtension}`;
        const filepath = path.join(os.tmpdir(), imageFileName);
    
        imageToBeUploaded = { filepath, mimetype };
        file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on("finish", () => {
        firebase.admin
        .storage()
        .bucket()
        .upload(imageToBeUploaded.filepath, {
            resumable: false,
            destination: 'profileImages/' + imageFileName,
            metadata: {
            metadata: {
                contentType: imageToBeUploaded.mimetype,
                firebaseStorageDownloadTokens: generatedToken,
            },
            },
        })
        .then(() => {
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/theatronfinal.appspot.com/o/profileImages%2F${imageFileName}?alt=media&token=${generatedToken}`;

            //Change url
            firebase.admin.database().ref('USER').child(uid).update({'photourl': imageUrl})

            return imageUrl
        })
        .catch((err) => {
            return "something went wrong";
        });
    });
    busboy.end(req.rawBody);

}

static async pendingVideo() {
    const ref = firebase.admin.database().ref('PENDING_VIDEOS')
    const snapshot = await ref.once('value')
    var video = []
    snapshot.forEach(child => {
        var item = child.toJSON()
        item.id = child.key
        video.push(item)
    })

    return video
}
        
    

}

module.exports = { Utils }
