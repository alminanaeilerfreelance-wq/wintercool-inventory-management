import React, { useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  IconButton,
  Badge,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Skeleton
} from '@mui/material';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DownloadIcon from '@mui/icons-material/Download';

import ReplyIcon from '@mui/icons-material/Reply';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import { useSettings } from '../../context/SettingsContext';

const MessageList = ({
  messages = [],
  currentUserId,
  usersOnline = new Set(),
  onImageLoad,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onReplyTo,
  onReact
}) => {
  const messagesEndRef = useRef(null);
  const rootRef = useRef(null);
  const { settings } = useSettings();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const isOwnMessage = (message) => message.sender._id === currentUserId;
  const isRead = (message) => message.readBy?.some(r => r.user._id === currentUserId);
  const isOnline = (userId) => usersOnline.has(userId);

  const formatTime = (date) => new Date(date).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const handleReply = (message) => {
    onReplyTo?.(message);
  };

  const handleReact = (message, reaction) => {
    onReact?.(message, reaction);
  };

  const MessageBubble = ({ message, isOwn, isRead }) => {
    const isMedia = message.type === 'image' || message.type === 'file' || message.type === 'audio';
    
    return (
      <ListItem
        disablePadding
        sx={{
          my: 0.5,
          px: 2,
          '&:hover': { bgcolor: 'action.hover' }
        }}
      >
        <Box sx={{ width: '100%' }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: isOwn ? 'flex-end' : 'flex-start',
            mb: 0.5
          }}>
              <Paper
              elevation={isOwn ? 2 : 1}
              sx={{
                maxWidth: '75%',
                p: 1.5,
                borderRadius: 3,
                bgcolor: isOwn ? 'primary.main' : 'background.paper',
                color: isOwn ? 'common.white' : 'text.primary',
                position: 'relative',
                ...(message.replyTo && {
                  borderLeft: `4px solid ${alpha('primary.main', 0.3)}`,
                  pl: 2.5
                })
              }}
            >
              {message.replyTo && (
                <Box sx={{ 
                  mb: 1, 
                  p: 1, 
                  bgcolor: alpha('primary.100', 0.3), 
                  borderRadius: 2, 
                  fontSize: '0.8rem'
                }}>
                  <Typography variant="caption" color="text.secondary">
                    Replying to {message.replyTo.sender?.name}
                  </Typography>
                  <Typography sx={{ mt: 0.25, lineHeight: 1.3 }}>
                    {message.replyTo.content?.substring(0, 50)}{message.replyTo.content?.length > 50 ? '...' : ''}
                  </Typography>
                </Box>
              )}
              {isMedia ? (
                message.type === 'image' ? (
                  <Box
                    component="img"
                    src={message.file.url}
                    alt="Sent image"
                    sx={{
                      width: 200,
                      height: 200,
                      objectFit: 'cover',
                      borderRadius: 2,
                      cursor: 'pointer'
                    }}
                    onLoad={onImageLoad}
                  />
                ) : message.type === 'audio' ? (
                  <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                    <IconButton size="large">
                      <PlayArrowIcon />
                    </IconButton>
                    <Typography variant="caption" display="block">
                      Audio message
                    </Typography>
                    <IconButton size="small">
                      <DownloadIcon />
                    </IconButton>
                  </Paper>
                ) : (
                  <Paper sx={{ p: 1.5, textAlign: 'center' }}>
                    <VolumeUpIcon sx={{ fontSize: 40 }} />
                    <Typography variant="body2">
                      {message.file.originalName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Math.round(message.file.size / 1024)} KB
                    </Typography>
                  </Paper>
                )
              ) : (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.4 }}>
                  {message.content}
                </Typography>
              )}
              
              <Box sx={{ 
                position: 'absolute', 
                bottom: 4, 
                right: isOwn ? 8 : 8,
                left: isOwn ? 'auto' : 8,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: '0.75rem'
              }}>
                <Typography>{formatTime(message.createdAt)}</Typography>
                {isOwn && (
                  <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
                    <CheckCircleOutlineIcon 
                      fontSize="small" 
                      sx={{ 
                        fontSize: '0.85rem',
                        color: isRead ? 'success.light' : 'grey.400'
                      }} 
                    />
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>

          {!isOwn && (
            <ListItemAvatar sx={{ minWidth: 48, alignSelf: 'flex-end' }}>
              <Badge
                overlap="circular"
                variant="dot"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                color={isOnline(message.sender._id) ? "success" : "default"}
              >
                <Avatar 
                  sx={{ width: 36, height: 36 }}
                  src={message.sender.avatar}
                >
                  {message.sender.name?.charAt(0)?.toUpperCase()}
                </Avatar>
              </Badge>
            </ListItemAvatar>
          )}
        </Box>
      </ListItem>
    );

  };

  return (
    <Box ref={rootRef} sx={{ 
      flex: 1, 
      overflow: 'auto',
      bgcolor: 'grey.50',
      py: 2
    }}>
      {isLoadingMore && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Skeleton />
        </Box>
      )}
      {messages.map((message) => (
        <MessageBubble
          key={message._id}
          message={message}
          isOwn={isOwnMessage(message)}
          isRead={isRead(message)}
        />
      ))}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;
