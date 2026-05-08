const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// GET user's conversations
router.get('/conversations', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .populate('participants', 'name email avatar role assignedBranch')
    .populate('lastMessage', 'content createdAt sender type')
    .populate('createdBy', 'name')
    .sort({ lastMessageAt: -1 });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET conversation by ID
router.get('/conversations/:id', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id
    }).populate('participants', 'name email avatar role');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET messages in conversation (paginated)
router.get('/conversations/:id/messages', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      conversation: req.params.id,
      sender: { $ne: req.user._id } // Don't mark own messages as read
    })
    .populate('sender', 'name avatar role')
    .populate('replyTo', 'content sender')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

    // Mark messages as read
    await Message.updateMany({
      conversation: req.params.id,
      sender: { $ne: req.user._id },
      'readBy.user': { $ne: req.user._id }
    }, {
      $addToSet: { readBy: { user: req.user._id, readAt: new Date() } }
    });

    res.json({ messages: messages.reverse(), hasMore: messages.length === Number(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE conversation
router.post('/conversations', protect, async (req, res) => {
  try {
    const { participants, name, isGroup } = req.body;
    
    // Participants must include sender
    const allParticipants = [req.user._id, ...participants.filter(p => p !== req.user._id.toString())];
    
    // Check if 1-1 conversation already exists
    if (!isGroup && participants.length === 1) {
      const existing = await Conversation.findOne({
        participants: { $size: 2, $all: [req.user._id, participants[0]] }
      });
      if (existing) {
        return res.json(existing);
      }
    }

    const conversation = new Conversation({
      name: isGroup ? name : undefined,
      isGroup,
      participants: allParticipants,
      createdBy: req.user._id
    });

    const saved = await conversation.save();
    const populated = await Conversation.findById(saved._id)
      .populate('participants', 'name email avatar role assignedBranch')
      .populate('createdBy', 'name');

    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// SEND message
router.post('/messages', protect, async (req, res) => {
  try {
    const { conversation: conversationId, content, type = 'text', file, replyTo } = req.body;
    
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const message = new Message({
      conversation: conversationId,
      sender: req.user._id,
      type,
      content,
      file,
      replyTo,
      storeBranch: conversation.storeBranch
    });

    const savedMessage = await message.save();

    // Update conversation last message
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: savedMessage._id,
      lastMessageAt: savedMessage.createdAt,
      $inc: { 
        'unreadCounts.$[elem].count': 1 
      }
    }, {
      arrayFilters: [{ 'elem.user': { $ne: req.user._id } }]
    });

    const populatedMessage = await Message.findById(savedMessage._id)
      .populate('sender', 'name avatar role')
      .populate('replyTo', 'content sender');

    res.status(201).json(populatedMessage);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// MARK messages as read
router.post('/messages/read', protect, async (req, res) => {
  try {
    const { conversation } = req.body;
    
    await Message.updateMany({
      conversation,
      sender: { $ne: req.user._id }
    }, {
      $addToSet: { readBy: { user: req.user._id, readAt: new Date() } }
    });

    res.json({ message: 'Messages marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const User = require('../models/User');

// GET list of users for messaging/broadcast
router.get('/users', protect, async (req, res) => {
  try {
    const { search, exclude = req.user._id, limit = 50 } = req.query;
    const query = { 
      _id: { $ne: req.user._id }, 
      isActive: true 
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('name username email avatar role assignedBranch isActive')
      .limit(Number(limit))
      .sort({ name: 1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPLOAD file for messages
const multer = require('multer');
const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|ogg|mp3|wav|pdf|doc|docx/;
    if (allowedTypes.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    };

    res.json({ file });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// BROADCAST message to all users (existing)
router.post('/broadcast', protect, async (req, res) => {
  try {
    const { content, type = 'text' } = req.body;

    // Get all users except the sender
    const User = require('../models/User');
    const allUsers = await User.find({ _id: { $ne: req.user._id } }, '_id name email avatar role');

    if (allUsers.length === 0) {
      return res.status(400).json({ message: 'No other users to broadcast to' });
    }

    // Create broadcast conversation if it doesn't exist
    let broadcastConversation = await Conversation.findOne({
      name: 'Broadcast',
      isGroup: true,
      createdBy: req.user._id
    });

    if (!broadcastConversation) {
      broadcastConversation = new Conversation({
        name: 'Broadcast',
        isGroup: true,
        participants: [req.user._id, ...allUsers.map(u => u._id)],
        createdBy: req.user._id
      });
      await broadcastConversation.save();
    } else {
      // Ensure all current users are participants
      const currentParticipants = broadcastConversation.participants.map(p => p.toString());
      const newParticipants = allUsers.filter(u => !currentParticipants.includes(u._id.toString())).map(u => u._id);

      if (newParticipants.length > 0) {
        broadcastConversation.participants.push(...newParticipants);
        await broadcastConversation.save();
      }
    }

    // Create the broadcast message
    const message = new Message({
      conversation: broadcastConversation._id,
      sender: req.user._id,
      type,
      content: `[BROADCAST] ${content}`,
    });

    const savedMessage = await message.save();

    // Update conversation last message
    await Conversation.findByIdAndUpdate(broadcastConversation._id, {
      lastMessage: savedMessage._id,
      lastMessageAt: savedMessage.createdAt
    });

    const populatedMessage = await Message.findById(savedMessage._id)
      .populate('sender', 'name avatar role')
      .populate('conversation', 'name participants');

    res.status(201).json({
      message: populatedMessage,
      conversation: broadcastConversation,
      recipients: allUsers.length
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;

