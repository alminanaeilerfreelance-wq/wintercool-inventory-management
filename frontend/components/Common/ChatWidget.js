import React, { useState, useEffect, useRef } from 'react';
import {
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Avatar,
  TextField,
  IconButton,
  Paper,
  Stack,
  Badge,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Close as CloseIcon,
  Send as SendIcon,
  Minimize as MinimizeIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';

const ChatWidget = () => {
  const { user, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  // Socket connection
  useEffect(() => {
    if (!token || !user?._id || !open) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('authenticate', token, (response) => {
        if (response.error) {
          console.error('Socket authentication failed:', response.error);
        } else {
          console.log('Socket authenticated:', response.user);
          loadConversations();
        }
      });
    });

    newSocket.on('new_message', (message) => {
      if (selectedConversation && message.conversation.toString() === selectedConversation._id.toString()) {
        setMessages(prev => [...prev, message]);
      }
      // Update conversations list
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv._id.toString() === message.conversation.toString()) {
            return { ...conv, lastMessage: message, lastMessageAt: message.createdAt };
          }
          return conv;
        });
        return updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      });
      setUnreadCount(prev => prev + 1);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [token, user?._id, open, selectedConversation]);

  const loadConversations = async () => {
    try {
      const res = await fetch(`${API_BASE}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const res = await fetch(`${API_BASE}/messages/conversations/${conversationId}/messages?page=1&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation._id);
    setUnreadCount(0);
    
    // Join conversation room
    if (socket) {
      socket.emit('join_conversation', conversation._id);
    }
  };

  const handleBroadcastMessage = () => {
    if (!newMessage.trim() || !socket) return;

    const messageData = {
      content: newMessage.trim(),
      type: 'text',
    };

    socket.emit('broadcast_message', messageData);
    setNewMessage('');
    
    // Refresh conversations to show the broadcast
    setTimeout(() => loadConversations(), 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) return null;

  return (
    <>
      {/* Floating Chat Button */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
          boxShadow: 3,
        }}
        onClick={() => setOpen(true)}
      >
        <Badge badgeContent={unreadCount} color="error">
          <ChatIcon />
        </Badge>
      </Fab>

      {/* Chat Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: minimized ? 400 : 800,
            height: minimized ? 60 : 600,
            margin: 0,
            borderRadius: 2,
            boxShadow: 4,
          },
        }}
      >
        <DialogTitle
          sx={{
            p: 2,
            bgcolor: 'primary.main',
            color: 'white',
            cursor: minimized ? 'pointer' : 'default',
          }}
          onClick={() => minimized && setMinimized(false)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ChatIcon />
              <Typography variant="h6" fontWeight={600}>
                Team Chat
              </Typography>
              {unreadCount > 0 && (
                <Chip
                  label={unreadCount}
                  size="small"
                  color="secondary"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
            <Box>
              <IconButton
                size="small"
                onClick={() => setMinimized(!minimized)}
                sx={{ color: 'white', mr: 1 }}
              >
                <MinimizeIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setOpen(false)}
                sx={{ color: 'white' }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        {!minimized && (
          <>
            <DialogContent sx={{ p: 0, display: 'flex', height: 540 }}>
              {/* Conversations List */}
              <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider' }}>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Conversations
                  </Typography>
                </Box>
                <List sx={{ height: 440, overflow: 'auto' }}>
                  {conversations.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No conversations yet
                      </Typography>
                    </Box>
                  ) : (
                    conversations.map((conv) => (
                      <ListItem
                        key={conv._id}
                        button
                        selected={selectedConversation?._id === conv._id}
                        onClick={() => handleSelectConversation(conv)}
                        sx={{ borderBottom: 1, borderColor: 'divider' }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {conv.name?.charAt(0) || 'C'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {conv.name || 'Unnamed Conversation'}
                              {conv.name === 'Broadcast' && (
                                <Chip label="BROADCAST" size="small" color="primary" sx={{ fontSize: '0.6rem', height: 16 }} />
                              )}
                            </Box>
                          }
                          secondary={
                            conv.lastMessage
                              ? `${conv.lastMessage.sender?.name || 'Unknown'}: ${conv.lastMessage.content?.substring(0, 30)}${conv.lastMessage.content?.length > 30 ? '...' : ''}`
                              : 'No messages yet'
                          }
                          primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }}
                          secondaryTypographyProps={{ fontSize: '0.75rem' }}
                        />
                      </ListItem>
                    ))
                  )}
                </List>
              </Box>

              {/* Messages Area */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {selectedConversation ? (
                  <>
                    {/* Messages Header */}
                    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {selectedConversation.name || 'Conversation'}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleBroadcastMessage()}
                          sx={{ fontSize: '0.75rem' }}
                        >
                          Broadcast to All
                        </Button>
                      </Box>
                      {/* Display Participants */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="caption" color="text.secondary">
                          Participants:
                        </Typography>
                        {selectedConversation.participants?.map((participant) => (
                          <Chip
                            key={participant._id}
                            label={participant.name || participant.email}
                            size="small"
                            variant="outlined"
                            avatar={
                              <Avatar sx={{ width: 20, height: 20 }}>
                                {participant.name?.charAt(0) || participant.email?.charAt(0) || 'U'}
                              </Avatar>
                            }
                            sx={{ fontSize: '0.7rem', height: 24 }}
                          />
                        ))}
                      </Box>
                    </Box>

                    {/* Messages List */}
                    <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                      <Stack spacing={2}>
                        {messages.map((message) => (
                          <Box
                            key={message._id}
                            sx={{
                              display: 'flex',
                              justifyContent: message.sender?._id === user._id ? 'flex-end' : 'flex-start',
                            }}
                          >
                            <Paper
                              sx={{
                                p: 1.5,
                                maxWidth: '70%',
                                bgcolor: message.sender?._id === user._id ? 'primary.main' : 'grey.100',
                                color: message.sender?._id === user._id ? 'white' : 'text.primary',
                                borderRadius: 2,
                                border: message.content?.startsWith('[BROADCAST]') ? '2px solid #ff9800' : 'none',
                              }}
                            >
                              {message.content?.startsWith('[BROADCAST]') && (
                                <Typography variant="caption" sx={{ 
                                  display: 'block', 
                                  color: message.sender?._id === user._id ? 'rgba(255,255,255,0.8)' : '#ff9800',
                                  fontWeight: 'bold',
                                  mb: 0.5 
                                }}>
                                  📢 BROADCAST MESSAGE
                                </Typography>
                              )}
                              <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                {message.content?.startsWith('[BROADCAST]') 
                                  ? message.content.replace('[BROADCAST] ', '') 
                                  : message.content}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  display: 'block',
                                  mt: 0.5,
                                  color: message.sender?._id === user._id ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                                }}
                              >
                                {new Date(message.createdAt).toLocaleTimeString()}
                              </Typography>
                            </Paper>
                          </Box>
                        ))}
                        <div ref={messagesEndRef} />
                      </Stack>
                    </Box>

                    {/* Message Input */}
                    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          multiline
                          maxRows={3}
                        />
                        <IconButton
                          color="primary"
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim()}
                        >
                          <SendIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </>
                ) : (
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <ChatIcon sx={{ fontSize: 48, color: 'grey.300' }} />
                    <Typography variant="body1" color="text.secondary">
                      Select a conversation to start chatting
                    </Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </>
  );
};

export default ChatWidget;
