This is a chat server written with HTML, CSS, and Javascript. It also uses NodeJS and Socket.io

- You can choose a nickname and start chatting! Users must create and join chat servers to recieve and send messagse to others
- creators of chat rooms can kick or ban users from their chat rooms. Room creators can also grant moderator priveliges to other users and send a web alert
  to users on the chat
- there is no database and user info/messages is stored temporarily in the backend javascript. Reloading every instance will thus destroy all chat rooms      and user info.


PS: in order to run the project, you must have NodeJs and Socket.io installed on your system and have NodeJS modules in the directory parallel to the client.html script. You must then run "node <path to chat-server.js>" in terminal to activate the server before running the client.html script.
