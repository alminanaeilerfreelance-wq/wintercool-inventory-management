const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// Socket event handlers for messenger
const setupSocketHandlers = (io, socket) => {
  // Authenticate socket connection
  socket.on('authenticate', async (token, callback) => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const User = require('../models/User');
      const user = await User.findById(decoded.id).select('name role');
      if (!user) return callback({ error: 'Invalid user' });
      
      socket.user = user;
      socket.join(`user_${user._id}`);
      
      // Join admin room if admin
      if (user.role === 'admin') {
        socket.join('admin_room');
      }
      
      callback({ success: true, user });
    } catch (err) {
      callback({ error: 'Authentication failed' });
    }
  });

  // Get user's conversations
  socket.on('get_conversations', async () => {
    if (!socket.user) return socket.emit('error', 'Not authenticated');
    
    const conversations = await Conversation.find({ participants: socket.user._id })
      .populate('participants', 'name avatar role')
      .populate('lastMessage', 'content type createdAt sender')
      .sort({ lastMessageAt: -1 });
    
    socket.emit('conversations', conversations);
  });

  // Send message
  socket.on('send_message', async (data) => {
    if (!socket.user) return socket.emit('error', 'Not authenticated');
    
    try {
      const message = new Message({
        conversation: data.conversationId,
        sender: socket.user._id,
        type: data.type || 'text',
        content: data.content,
        file: data.file
      });
      
      const savedMessage = await message.save();
      const populatedMessage = await Message.findById(savedMessage._id)
        .populate('sender', 'name avatar role')
        .populate('replyTo', 'content sender');
      
      // Update conversation last message
      await Conversation.findByIdAndUpdate(data.conversationId, {
        lastMessage: savedMessage._id,
        lastMessageAt: savedMessage.createdAt
      });
      
      // Get conversation participants
      const conversation = await Conversation.findById(data.conversationId).populate('participants', '_id');
      
      // Emit to conversation participants (except sender)
      socket.to(`conversation_${data.conversationId}`).emit('new_message', populatedMessage);
      
      // Also emit to individual user rooms for users who might not be in the conversation room
      conversation.participants.forEach(participant => {
        if (participant._id.toString() !== socket.user._id.toString()) {
          io.to(`user_${participant._id}`).emit('new_message', populatedMessage);
        }
      });
      
      socket.emit('message_sent', populatedMessage);
    } catch (err) {
      socket.emit('error', err.message);
    }
  });

  // Typing indicator
  socket.on('typing', (data) => {
    socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
      userId: socket.user._id,
      conversationId: data.conversationId,
      isTyping: data.isTyping
    });
  });

  // Join conversation room
  socket.on('join_conversation', (conversationId) => {
    if (!socket.user) return socket.emit('error', 'Not authenticated');
    socket.join(`conversation_${conversationId}`);
  });

  // Leave conversation room
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
  });

  socket.on('read_messages', async (conversationId) => {
    if (!socket.user) return;
    
    await Message.updateMany({
      conversation: conversationId,
      sender: { $ne: socket.user._id }
    }, {
      $addToSet: { readBy: { user: socket.user._id } }
    });
    
    socket.to(`conversation_${conversationId}`).emit('messages_read', {
      userId: socket.user._id,
      conversationId
    });
  });

  // Broadcast message to all users
  socket.on('broadcast_message', async (data) => {
    if (!socket.user) return socket.emit('error', 'Not authenticated');
    
    try {
      const User = require('../models/User');
      const allUsers = await User.find({ _id: { $ne: socket.user._id } }, '_id');

      // Create broadcast conversation if it doesn't exist
      let broadcastConversation = await Conversation.findOne({
        name: 'Broadcast',
        isGroup: true,
        createdBy: socket.user._id
      });

      if (!broadcastConversation) {
        broadcastConversation = new Conversation({
          name: 'Broadcast',
          isGroup: true,
          participants: [socket.user._id, ...allUsers.map(u => u._id)],
          createdBy: socket.user._id
        });
        await broadcastConversation.save();
      }

      // Create the broadcast message
      const message = new Message({
        conversation: broadcastConversation._id,
        sender: socket.user._id,
        type: data.type || 'text',
        content: `[BROADCAST] ${data.content}`,
      });

      const savedMessage = await message.save();
      const populatedMessage = await Message.findById(savedMessage._id)
        .populate('sender', 'name avatar role');

      // Update conversation last message
      await Conversation.findByIdAndUpdate(broadcastConversation._id, {
        lastMessage: savedMessage._id,
        lastMessageAt: savedMessage.createdAt
      });

      // Emit to all users in the broadcast conversation
      const conversation = await Conversation.findById(broadcastConversation._id).populate('participants', '_id');
      
      // Emit to all participants in the conversation room
      io.to(`conversation_${broadcastConversation._id}`).emit('new_message', populatedMessage);
      
      // Also emit to individual user rooms for users who might not be in the conversation room
      conversation.participants.forEach(participant => {
        if (participant._id.toString() !== socket.user._id.toString()) {
          io.to(`user_${participant._id}`).emit('new_message', populatedMessage);
        }
      });
      
      socket.emit('message_sent', populatedMessage);
    } catch (err) {
      socket.emit('error', err.message);
    }
  });

  // User online status
  socket.on('user_online', (userId) => {
    io.emit('user_status', { userId, status: 'online' });
  });

  socket.on('user_offline', (userId) => {
    io.emit('user_status', { userId, status: 'offline' });
  });
};

module.exports = setupSocketHandlers;
