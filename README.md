# Chatterbox

This project is an online chatroom creator which allows users to make temporary chatrooms which their friends can join and use. 

## Demo

1. Enter a room code to join an existing room or to create a new one
2. Share the code/link with your friends you want to invite - they can use it to join
3. Lock the chat and have a fun chat without knowing who's who for as long as you want
4. Once everyone has disconnected or there is no activity for 30 minutes the room's history will be erased, keeping your privacy secured

The idea came from wanting to add a layer of mystery to playing online games with friends. By having randomly generated usernames, you will only know who is in the chatroom - but you will not know who individual messengers are.

## Installing

To run the project locally, `clone` the repository and download the dependencies (`npm install`), finally make sure a local instance of `Redis` is running. From the base directory - run `npm start`. Navigate to `http://localhost:3000/` and you can interact with the app.

## Tech-Stack

Project was created with: Socket.IO, Node.js, Redis, jQuery, JavaScript, HTML and CSS.