import React, { useRef, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import ReplyIcon from '@mui/icons-material/Reply';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DoneIcon from '@mui/icons-material/Done';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

dayjs.extend(isToday);
dayjs.extend(isYesterday);

const formatTime = (date) => dayjs(date).format('HH:mm');

const formatDateLabel = (date) => {
  const d = dayjs(date);
  if (d.isToday()) return 'Today';
  if (d.isYesterday()) return 'Yesterday';
  return d.format('MMM DD, YYYY');
};

const MessageList = ({
  messages = [],
  currentUserId,
  usersOnline = new Set(),
  hasMore,
  isLoadingMore,
  onLoadMore,
  onReplyTo,
}) => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const isOwn = (msg) => {
    const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
    return senderId === currentUserId;
  };

  const isRead = (msg) => msg.readBy?.some((r) => {
    const uid = typeof r.user === 'object' ? r.user._id : r.user;
    return uid === currentUserId;
  });

  // Group messages by date
  const grouped = [];
  let lastDate = null;
  for (const msg of messages) {
    const dateLabel = formatDateLabel(msg.createdAt);
    if (dateLabel !== lastDate) {
      grouped.push({ type: 'date', label: dateLabel });
      lastDate = dateLabel;
    }
    grouped.push({ type: 'message', msg });
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        flex: 1,
        overflowY: 'auto',
        px: 2,
        py: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        bgcolor: '#f0f2f5',
        minHeight: 0,
      }}
    >
      {/* Load more */}
      {isLoadingMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <CircularProgress size={20} />
        </Box>
      )}
      {hasMore && !isLoadingMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pb: 1 }}>
          <Typography
            variant="caption"
            sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
            onClick={onLoadMore}
          >
            Load older messages
          </Typography>
        </Box>
      )}

      {messages.length === 0 && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, gap: 1 }}>
          <ChatBubbleOutlineIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
          <Typography variant="body2" color="text.disabled">No messages yet. Say hi!</Typography>
        </Box>
      )}

      {grouped.map((item, idx) => {
        if (item.type === 'date') {
          return (
            <Box key={`date-${idx}`} sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1 }}>
              <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
              <Typography variant="caption" color="text.secondary" sx={{ px: 1, bgcolor: '#f0f2f5', fontSize: '0.7rem', fontWeight: 600 }}>
                {item.label}
              </Typography>
              <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
            </Box>
          );
        }

        const { msg } = item;
        const own = isOwn(msg);
        const read = isRead(msg);
        const senderName = typeof msg.sender === 'object' ? msg.sender?.name : '';

        return (
          <Box
            key={msg._id || idx}
            sx={{
              display: 'flex',
              flexDirection: own ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
              gap: 1,
              '&:hover .msg-actions': { opacity: 1 },
            }}
          >
            {/* Avatar for others */}
            {!own && (
              <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', flexShrink: 0, mb: 0.5 }}>
                {senderName?.[0]?.toUpperCase() || '?'}
              </Avatar>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: own ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
              {/* Sender name for group */}
              {!own && senderName && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, mb: 0.25, fontWeight: 600 }}>
                  {senderName}
                </Typography>
              )}

              {/* Reply preview */}
              {msg.replyTo && (
                <Box
                  sx={{
                    mb: 0.5,
                    px: 1.5,
                    py: 0.75,
                    bgcolor: own ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
                    borderRadius: '12px 12px 0 0',
                    borderLeft: '3px solid',
                    borderLeftColor: own ? 'rgba(255,255,255,0.6)' : 'primary.main',
                    maxWidth: '100%',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 600, color: own ? 'rgba(255,255,255,0.8)' : 'primary.main', display: 'block' }}>
                    {msg.replyTo.sender?.name || 'Someone'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: own ? 'rgba(255,255,255,0.7)' : 'text.secondary', display: 'block' }} noWrap>
                    {msg.replyTo.content}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, flexDirection: own ? 'row-reverse' : 'row' }}>
                {/* Bubble */}
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    bgcolor: own ? 'primary.main' : 'white',
                    color: own ? 'white' : 'text.primary',
                    borderRadius: own ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                    wordBreak: 'break-word',
                    position: 'relative',
                  }}
                >
                  <Typography variant="body2" sx={{ lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mt: 0.25, justifyContent: 'flex-end' }}>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.7 }}>
                      {formatTime(msg.createdAt)}
                    </Typography>
                    {own && (
                      read
                        ? <DoneAllIcon sx={{ fontSize: '0.75rem', color: own ? 'rgba(255,255,255,0.8)' : 'info.main' }} />
                        : <DoneIcon sx={{ fontSize: '0.75rem', opacity: 0.6 }} />
                    )}
                  </Box>
                </Box>

                {/* Action: reply */}
                <Box className="msg-actions" sx={{ opacity: 0, transition: 'opacity 0.15s' }}>
                  <Tooltip title="Reply">
                    <IconButton size="small" onClick={() => onReplyTo?.(msg)} sx={{ width: 24, height: 24 }}>
                      <ReplyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          </Box>
        );
      })}

      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;
