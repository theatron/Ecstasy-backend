const firebase = require('./firebaseFunc.js');

function sendNotification(title, body, userID) {
    const tokens = [
        'AAAAajxFiek:APA91bHWnEOxTIZWe5K9byJtRws_kh2ttZ45HZCiPyUB5tIhekQiEXFmv7c9QEYZyiR3tubcMoLEbsf5beanvoD_zlEVa7cEXZJ5hXq_5paQ8C7BCy1fjfezNkqkMYGAnn02UmzfBVQj'
    ]
    const topic = userID
    const message = {
        notification: {
            title: title,
            body: body
        },
        topic: topic
    };
    firebase.admin.messaging().send(message)
        .then(response => console.log('Successfully sent message:', response))
        .catch(error => console.log('Error sending message:', error))
}

function sendNotification(title, body, userID, imageURL) {
    const tokens = [
        'AAAAajxFiek:APA91bHWnEOxTIZWe5K9byJtRws_kh2ttZ45HZCiPyUB5tIhekQiEXFmv7c9QEYZyiR3tubcMoLEbsf5beanvoD_zlEVa7cEXZJ5hXq_5paQ8C7BCy1fjfezNkqkMYGAnn02UmzfBVQj'
    ]
    const topic = userID
    const message = {
        notification: {
            title: title,
            body: body
        },
        android: {
            notification: {
              image: imageURL
            }
          },
          apns: {
            payload: {
              aps: {
                'mutable-content': 1
              }
            },
            fcm_options: {
              image: imageURL
            }
          },
          webpush: {
            headers: {
              image: imageURL
            }
          },
        topic: topic
    };
    firebase.admin.messaging().send(message)
        .then(response => console.log('Successfully sent message:', response))
        .catch(error => console.log('Error sending message:', error))
}

module.exports = { sendNotification }