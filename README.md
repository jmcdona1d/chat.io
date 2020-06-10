# chat.io

This project is an online chatroom creator which allows users to make temporary chatrooms which their friends can join and use. After a period of time of innactivity, the chat history is erased and cannot be recovered.

To run the project locally, `clone` the repository and download the repository (`npm install`), finally make sure a local instance of `Redis` is running. From the base directory - run `npm start`. From there you can navigate to `http://localhost:3000/` and enter a `roomId` to either create or join a chatroom. This will put you into a chatroom where you can have others join or lock it to be private.

Project was created with: Socket.IO, Node.js, Redis, jQuery, JavaScript, HTML and CSS.