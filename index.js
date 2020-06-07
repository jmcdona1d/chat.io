var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var cookieParser = require('cookie-parser')
const redis = require('redis');
const jwt = require('jsonwebtoken')
const usernameService = require('./services/usernameService')

const REDIS_PORT = process.env.REDISPORT || 6379;
const cache = redis.createClient(REDIS_PORT);

const secret_key = "secret"
const jwtExpiry = 300

app.use(cookieParser())


app.get('/chat', (req, res) => {
  if (req.query.roomId == null) {
    //throw error when no query params (prevent local server from crashing on error)
    res.send("need room Id")
    return
  }
  var cookie = -1;
  var username = usernameService.getUserName()
  // if (req.cookies.cookie == null) {
  const token = jwt.sign({ username: username }, secret_key, {
    algorithm: "HS256",
    expiresIn: jwtExpiry
  })
  res.cookie("cookie", token, 200 * 1000)
  //should set timeout as well
  // }

  // else {
  //   cookie = req.cookies.cookie;
  // }
  res.sendFile(__dirname + '/templates/chat.html');
  cache.setex(username, 61, req.query.roomId)
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/templates/index.html')
})

io.on('connection', (socket) => {
  io.to(socket.id).emit("connection request")

  socket.on('connection request', (cookie) => {
    //on first connection either create a room or get the current room data
    //get roomID for cookie and assign socket to it
    jwt.verify(cookie, secret_key, function (err, decoded) {
      if (err) throw err;

      cache.get(decoded['username'], (err, roomId) => {
        if (err) throw err;

        if (roomId != null) {
          //socket.join(room)

          //see if room already has a chat log -> if no make one, if yes get it and send to client
          cache.get(roomId, (err, data) => {
            if (err) throw err;

            if (data == null) {
              var chatLog = [];
              socket.join(roomId)
            }

            //send to just client that joined (others have whole log already)
            if (data != null) {
              if (JSON.parse(data)["locked"]) {
                console.log("f")
                io.to(socket.id).emit("room locked")
                return
              }
              socket.join(roomId)
              var chatLog = JSON.parse(data)["chatLog"]
              io.to(socket.id).emit("fetch chatlog", chatLog)
            }

            //send out connection message to room and chatlog and save chatlog
            const connectMessage = decoded['username'] + " has joined the chat!";
            chatLog.push(connectMessage)
            io.in(roomId).emit("chat message", connectMessage)
            const roomData = { "locked": false, "chatLog": chatLog }
            cache.setex(roomId, 62, JSON.stringify(roomData))
            cache.setex(socket.id, 200, decoded['username'])
          })
        }
      })
    })

  });

  socket.on('chat message', (pckg) => {
    const packet = JSON.parse(pckg)

    //get username from cookie
    jwt.verify(packet["cookie"], secret_key, function (err, decoded) {
      if (err) throw err

      const username = decoded['username']

      //get the room for the chat
      cache.get(username, (err, room) => {
        if (err) throw err;

        //echo the chat to the room's sockets and update the log
        else if (room != null) {
          const messageReturn = username + ": " + packet["message"];
          socket.to(room).emit('chat message', messageReturn);
          io.to(socket.id).emit("sent message", "You: " + packet["message"])

          cache.get(room, (err, data) => {
            if (err) throw err;

            if (data !== null) {
              roomData = JSON.parse(data)
              roomData["chatLog"].push(messageReturn)
              cache.setex(room, 63, JSON.stringify(roomData))
            }
          })
        }
      })
    });
  });

  socket.on('toggle lock', (cookie) => {
    jwt.verify(cookie, secret_key, function (err, decoded) {
      if (err) throw err

      const username = decoded['username']

      cache.get(username, (err, roomID) => {
        if (err) throw err;

        else if (roomID != null) {
          cache.get(roomID, (err, data) => {
            if (err) throw err;

            else if (data != null) {
              roomData = JSON.parse(data)
              roomData['locked'] = !roomData['locked']
              console.log(roomData['locked'])
              cache.setex(roomID, 63, JSON.stringify(roomData))
            }
          })
        }
      })
    })
  })

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
            io.in(room).emit("chat message", messageReturn);

            cache.get(room, (err, data) => {
              if (err) throw err

              if (data !== null) {
                roomData = JSON.parse(data)
                roomData["chatLog"].push(messageReturn)
                cache.setex(room, 60, JSON.stringify(roomData))
              }
            })

            //free up cache space once user no longer needed
            cache.del(socket.id)
          }
        })
      }
    });
  });
});

http.listen(3000, () => {
  console.log('listening on port 3000');
});