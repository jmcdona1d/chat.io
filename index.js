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
            console.log("empty")
            var chatLog = [];
          }

          //send to just client that joined ?
          if (data != null) {
            var chatLog = JSON.parse(data)
            io.to(socket.id).emit("fetch chatlog", chatLog)
          }

          //send out connection message to room and chatlog and save chatlog
          const connectMessage = cookie + " has joined the chat!";
          chatLog.push(connectMessage)
          console.log(room)
          io.in(room).emit("chat message", connectMessage)
          cache.setex(room, 62, JSON.stringify(chatLog))
        }
        )
      }
    })
  });

  socket.on('chat message', (pckg) => {
    var room = "a"
    const packet = JSON.parse(pckg)
    cache.get(socket.id, (err, username) => {
      if (err) throw err;
      else if (username != null) {
        const messageReturn = username + ": " + packet["message"];
        io.emit('chat message', messageReturn);

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
    const room = "a"
    var user = "f"
    cache.get(socket.id, (err, username) => {
      if (err) throw err;

      else if (username != null) {
        user = username;
        const messageReturn = user + " has left the chat."
        io.emit("user left", messageReturn);

        cache.get(room, (err, chatLog) => {
          if (err) throw err

          if (chatLog !== null) {
            chatLog = JSON.parse(chatLog)
            chatLog.push(messageReturn)
            // cache.setex(room, 60, JSON.stringify(chatLog))
          }
        })
      }
    });
  });
});

http.listen(3000, () => {
  console.log('listening on port 3000');
});