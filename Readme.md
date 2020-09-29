# Backend for all platforms

In some days there will be a proper instruction how to implement the backend for mobile platform

## /profile/edit
Deny friend request.
#### Header:
- name: `new name` (optional)
- username: `new username` (optional)
- bio: `new bio` (optional)
- number: `new phonenumber` (optional)
- web: `new website` (optional)

## /profile/can-be-friends
Deny friend request.
#### Header:
- phonenumbers: `phonenumber`
**you can provide more phonenumbers by adding `,`**

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