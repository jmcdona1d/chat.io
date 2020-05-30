var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var cookieParser = require('cookie-parser')
const redis = require('redis');
const uuid = require('uuid').v4;

const REDIS_PORT = process.env.REDISPORT||6379; 
const cache = redis.createClient(REDIS_PORT);

app.use(cookieParser())

app.get('/', (req, res) => {
  if(req.cookies.cookie == null){
    res.cookie("cookie", uuid(), null)
    //should set timeout as well
  }
  console.log(req.cookies)
  res.sendFile(__dirname + '/index.html');
  console.log(req.query.roomId)
  
});

io.on('connection', (socket) => {
  io.emit("connection request")

    socket.on('connection request', (cookie) =>{
      console.log(cookie)
       //on first connection either create a room or get the current room data
      cache.get("room", (err, data)=> {
        if(err) throw err;

        if(data==null){
          console.log("empty")
          var chatLog = [];
        }

        if(data!=null){
          var chatLog = JSON.parse(data)
          io.emit("fetch chatlog", chatLog)
        }

        const connectMessage = cookie +" has joined the chat!";
        chatLog.push(connectMessage)
        io.emit("user joined", connectMessage)
        cache.setex("room", 60, JSON.stringify(chatLog))
      })
    });

    socket.on('chat message', (pckg) => {
      const packet =  JSON.parse(pckg)
      console.log(packet)
        const messageReturn = packet["cookie"] +": " +packet["message"];
        io.emit('chat message', messageReturn);

        cache.get("room", (err, chatLog) => {
          if(err) throw err;

          if(chatLog!==null){
            chatLog = JSON.parse(chatLog)
            chatLog.push(messageReturn)
            cache.setex("room", 60, JSON.stringify(chatLog))
          }
        })
    });
    
    socket.on('disconnect', ()=> {
        const messageReturn = socket.id +" has left the chat."
        io.emit("user left", messageReturn);
    });
});

http.listen(3000, () => {
  console.log('listening on port 3000');
});