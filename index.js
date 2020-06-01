var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var cookieParser = require('cookie-parser')
const redis = require('redis');
const uuid = require('uuid').v4;
const usernameService = require('./services/usernameService')

const REDIS_PORT = process.env.REDISPORT || 6379;
const cache = redis.createClient(REDIS_PORT);

app.use(cookieParser())


app.get('/', (req, res) => {
  var cookie = -1;
  if (req.cookies.cookie == null) {
    cookie = uuid()
    res.cookie("cookie", cookie, null)
    //should set timeout as well
  }

  else {
    cookie = req.cookies.cookie;
  }
  if (req.query.roomId == null) {
    res.send("need room Id")
    return
  }
  res.sendFile(__dirname + '/index.html');
  cache.setex(cookie, 61, req.query.roomId)
});

io.on('connection', (socket) => {
  io.to(socket.id).emit("connection request")

  socket.on('connection request', (cookie) => {
    //on first connection either create a room or get the current room data
    //get roomID for cookie and assign socket to it
    console.log(cookie);
    cache.get(cookie, (err, data) => {
      if (err) throw err;

      if (data != null) {
        room = data;
        socket.join(room)


        //see if room already has a chat log -> if no make one, if yes get it and send to client
        cache.get(room, (err, data) => {
          if (err) throw err;

          if (data == null) {
            var chatLog = [];
          }

          //send to just client that joined (others have whole log already)
          if (data != null) {
            var chatLog = JSON.parse(data)
            io.to(socket.id).emit("fetch chatlog", chatLog)
          }

          //send out connection message to room and chatlog and save chatlog
          const connectMessage = cookie + " has joined the chat!";
          chatLog.push(connectMessage)
          io.in(room).emit("chat message", connectMessage)
          cache.setex(room, 62, JSON.stringify(chatLog))
          cache.setex(socket.id, 200, cookie)
        })
      }
    })
  });

  socket.on('chat message', (pckg) => {
    const packet = JSON.parse(pckg)
    const username = packet["cookie"]//temporary until usernames are stored in cookie

    //get the room from the cahce
    cache.get(packet["cookie"], (err, room) => {
      if (err) throw err;

      //echo the chat to the room's sockets and update the log
      else if (room != null) {
        const messageReturn = username + ": " + packet["message"];
        io.in(room).emit('chat message', messageReturn);

        cache.get(room, (err, chatLog) => {
          if (err) throw err;

          if (chatLog !== null) {
            chatLog = JSON.parse(chatLog)
            chatLog.push(messageReturn)
            cache.setex(room, 63, JSON.stringify(chatLog))
          }
        })
      }
    });

  });

  socket.on('disconnect', () => {

    //need to get username since we can't pass a cookie on disconnect
    cache.get(socket.id, (err, username) => {
      if (err) throw err;

      else if (username != null) {

        //get room name from username
        cache.get(username, (err, room) => {
          if (err) throw err;

          else if (room != null) {

            //socket leaves room, left chat is emitted to room and chatlog
            socket.leave(room)
            const messageReturn = username + " has left the chat."
            io.in(room).emit("user left", messageReturn);

            cache.get(room, (err, chatLog) => {
              if (err) throw err

              if (chatLog !== null) {
                chatLog = JSON.parse(chatLog)
                chatLog.push(messageReturn)
                cache.setex(room, 60, JSON.stringify(chatLog))
              }
            })

            //free up cache space once user no longer needed
            cache.del(socket.id)
            cache.del(username)
          }
        })
      }
    });
  });
});

http.listen(3000, () => {
  console.log('listening on port 3000');
});