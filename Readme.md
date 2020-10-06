# Backend for all platforms

In some days there will be a proper instruction how to implement the backend for mobile platform

Every request's header must include Bearer token:
- `Authorization`: 'Bearer `accessToken`'

## /profile/edit
Deny friend request.
#### Header:
- name: `new name` (optional)
- username: `new username` (optional)
- bio: `new bio` (optional)
- number: `new phonenumber` (optional)
- web: `new website` (optional)

## /profile/can-be-friends
Load possible friends by phonenumbers.
#### Header:
- phonenumbers: `phonenumber`

you can provide more phonenumbers by adding `,`

## /profile/friends
Loads your friends

## /profile/friend-requests
Load friend requests(received, sent).
#### Header:
- type: `type` (optional, R, S)

## /profile/be-friend
Sends friend request.
#### Header:
- friend: `friendIdentifier`

## /profile/accept-friend
Accept friend request.
#### Header:
- friend: `friendIdentifier`

## /profile/deny-friend
Deny friend request.
#### Header:
- friend: `friendIdentifier`

## /profile/delete-friend
Delete friend.
#### Header:
- friend: `friendIdentifier`

## /profile/thumbnail
Load thumbnail videos

## /profile/like-video
Add like to video
#### Header:
- video_owner: `video owner's identifier`
- video_number: `video number`

## /profile/remove-video-like
Remove like from video
#### Header:
- video_owner: `video owner's identifier`
- video_number: `video number`

## /profile/dislike-video
Add dislike to video
#### Header:
- video_owner: `video owner's identifier`
- video_number: `video number`

## /profile/remove-video-like
Remove dislike from video
#### Header:
- video_owner: `video owner's identifier`
- video_number: `video number`

## /profile/likes-video
Check if user likes video
#### Header:
- video_owner: `video owner's identifier`
- video_number: `video number`

## /profile/dislikes-video
Check if user dislikes video
#### Header:
- video_owner: `video owner's identifier`
- video_number: `video number`

## /profile/users-from-name
Search users by name
#### Header:
- text: `user's name query`

## /profile/admire
Admire user
#### Header:
- user: `user's identifier to admire`

## /profile/remove-admire
Remove user admire
#### Header:
- user: `user's identifier`

## /profile/videos-from-name
Search videos by title
#### Header:
- text: `video's title query`

## /profile/login
Login or create new user
#### Header:
- name: `user's name`
- type: `user's type`
- photourl: `photo url` (optional)

## /profile/share-video
Share video with caption
#### Header:
- video_owner: `video owner identifier`
- video_number: `video number`
- caption: `caption` (maximum 140 characters)

