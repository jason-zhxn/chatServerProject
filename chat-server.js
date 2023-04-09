// Require the packages we will use:
const http = require("http"),
    fs = require("fs");

const port = 3456;
const file = "client.html";
// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html, on port 3456:
const server = http.createServer(function (req, res) {
    // This callback runs when a new connection is made to our HTTP server.

    fs.readFile(file, function (err, data) {
        // This callback runs when the client.html file has been read from the filesystem.

        if (err) return res.writeHead(500);
        res.writeHead(200);
        res.end(data);
    });
});
server.listen(port);

let existingRooms = [];
let rooms = {};
let protectedRooms={};
sockets = {};
let roomCreators = {};
let bannedUsers = {}


// Import Socket.IO and pass our HTTP server object to it.
const socketio = require("socket.io")(http, {
    wsEngine: 'ws'
});

// Attach our Socket.IO server to our HTTP server to listen
const io = socketio.listen(server);
io.sockets.on("connection", function (socket) {
    // This callback runs when a new Socket.IO connection is established.
    socket.on("disconnect", () => {
        
        io.sockets.emit("disconnectedUser", socket.user);

        if (sockets[socket.user]) {
            delete sockets[socket.user];
        }
    })

    // callback for when server receives a new message from the client
    socket.on('message_to_server', function (data) {
        io.sockets.emit("message_to_client", { message: data["message"], userSender: data["user"], room: socket.room }) // broadcast the message to other users
    });

    // callback for when server receives a new private message from the client
    socket.on('privmessage_to_server', function(data){
        let id = sockets[data["privRecipient"]];
        let senderId = sockets[data["user"]];
        let message = data["privmsg"];
        socket.to(id).emit("privmessage_to_client", {priv: message, userSender: data["user"], userRecipient: data["privRecipient"]});
    });

    // callback for when server receives a new private message from the client
    socket.on('ogprivmessage_to_server', function(data){
        let message = data["privmsg"];
        socket.emit("privmessage_to_ogclient", {priv: message, userSender: data["user"], userRecipient: data["privRecipient"]});
    });


    // callback for when server receives a new room creation from the client
    socket.on('createRoom', function (data) {
        // if room with name already exists
        if(existingRooms.includes(data["name"])){
            socket.emit("repeatRoom");
        }
        // if unique new room name
        else{
            // if new room is private
            if(data.pwd==1){
                rooms[data["name"]]= [];
                protectedRooms[data["name"]]= data["pass"];
                roomCreators[data["name"]]=[];
                roomCreators[data["name"]].push(data["creator"]);
                bannedUsers[data["name"]]=[];
                io.sockets.emit("createRoomForClient", { name: data["name"] , pwd: data["pass"], protected: 1});
            }
            // if new room is public
            else{
                io.sockets.emit("createRoomForClient", { name: data["name"] })
                rooms[data["name"]]= [];
                roomCreators[data["name"]]=[];
                roomCreators[data["name"]].push(data["creator"]);
                bannedUsers[data["name"]]=[];
            }
            existingRooms.push(data["name"]);
        }
    });

    // callback for when server receives a new login 
    socket.on('username', function (data) {
        if(sockets[data["message"]]){  
            console.log(data["message"]);
            socket.emit("loggingIn", 0);
        } 
        else{
            socket.user = data["message"];
            socket.emit("loggingIn", data["message"]);
            sockets[socket.user]=data["id"];
            console.log(sockets);
        }
    });

    socket.on('grant', function (data) {
        let grantedUser = data["grantedUser"];
        let room = data["currentRoom"];
        roomCreators[room].push(grantedUser);
        io.sockets.emit("granted", {room: room, grantedUser:grantedUser});

    });

    socket.on('sendAlert', function (data) {
        let currentRoom = data["currentRoom"];
        let alertMessage = data["message"];
        let user = socket.user;
        io.sockets.emit("roomAlert", {currentRoom: currentRoom, message:alertMessage, user: user});

    });
    
    // callback for when server receives a kick request from client
    socket.on('kick', function (data) {
        let kickedId = sockets[data["kickedUser"]];
        console.log(kickedId);
        console.log(data["room"]);
        console.log(io.sockets.sockets.get(kickedId));

        let kickedSocket = io.sockets.sockets.get(kickedId);
        kickedSocket.leave(kickedSocket.room);
        kickedSocket.room = null;

        // io.sockets.sockets.get(kickedId).leave(data["room"]);
        socket.to(kickedId).emit("kick/ban");
        io.sockets.emit("disconnectedUser", data["kickedUser"]);
        
        if(data["ban"]==1){
            bannedUsers[data["room"]].push(data["kickedUser"]);
            console.log(bannedUsers);
        }
     
    });

    // callback for when client requests server to join a new room
    socket.on('joinRoom', function (data) {
        
        let roomName = data["name"];
        let currUser = data["user"];
        io.sockets.emit("disconnectedUser", currUser);


        // if the user has been banned
        if(bannedUsers[roomName].includes(currUser)){
            socket.emit("banAlert");
        }

        // if the user has not been banned
        else{
            socket.join(roomName);

            // if the current user is the creator of the chat room
            if(roomCreators[roomName].includes(currUser)){
                socket.emit("ownerButtons", 1)
            }
            else{
                socket.emit("wipeOwnerButtons");
            }
            
            socket.room = roomName;
            if(!rooms[roomName].includes(socket.user)){
                rooms[roomName].push(socket.user);
            }
            
            console.log(rooms[roomName]);
            console.log(roomName);
            socket.to(roomName).emit('addNames', socket.name);

            let nameList = rooms[roomName];
            console.log(nameList);

            io.sockets.emit("joinUser", {user: socket.user, room:socket.room, userList: nameList}); 

            console.log(socket.user);
            console.log("in room " + roomName);
            

        }
    });
});