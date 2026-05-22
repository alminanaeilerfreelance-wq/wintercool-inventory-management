import React, { useState, useRef } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import ReplyIcon from '@mui/icons-material/Reply';
import Picker from 'emoji-picker-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const MessageInput = ({
  onSendMessage,
  placeholder = 'Type a message…',
  disabled = false,
  socket,
  conversationId,
  currentUserId,
  replyTo,
  onCancelReply,
}) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();
  const fileInputRef = useRef();
  const typingTimerRef = useRef(null);

  const handleSend = () => {
    const text = message.trim();
    if (!text || uploading || disabled || !conversationId) return;
    onSendMessage({ conversationId, content: text, type: 'text', replyTo: replyTo?._id });
    setMessage('');
    if (onCancelReply) onCancelReply();
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    setMessage(e.target.value);
    if (socket && conversationId) {
      socket.emit('typing', { conversationId, isTyping: true });
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        socket.emit('typing', { conversationId, isTyping: false });
      }, 2000);
    }
  };

  const handleEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || uploading || !conversationId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = typeof window !== 'undefined' ? localStorage.getItem('wms_token') : '';
      const res = await fetch(`${API_BASE}/messages/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const { file: uploaded } = await res.json();
      const msgType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : 'file';
      onSendMessage({ conversationId, type: msgType, file: uploaded, content: file.name });
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const canSend = message.trim().length > 0 && !uploading && !disabled && !!conversationId;

  return (
    <Box sx={{ borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', px: 2, py: 1.5 }}>
      {/* Reply preview */}
      {replyTo && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, px: 1.5, py: 1, bgcolor: 'grey.50', borderRadius: 2, borderLeft: '3px solid', borderLeftColor: 'primary.main' }}>
          <ReplyIcon fontSize="small" color="primary" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="primary.main" fontWeight={600}>
              {replyTo.sender?.name || 'Someone'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
              {replyTo.content}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onCancelReply}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, position: 'relative' }}>
        {/* Emoji picker */}
        {showEmojiPicker && (
          <Box sx={{ position: 'absolute', bottom: '100%', left: 0, zIndex: 1300, mb: 1 }}>
            <Picker onEmojiClick={handleEmojiClick} height={360} width={320} />
          </Box>
        )}

        <Tooltip title="Emoji">
          <IconButton size="small" onClick={() => setShowEmojiPicker((v) => !v)} disabled={disabled}>
            <EmojiEmotionsIcon fontSize="small" sx={{ color: showEmojiPicker ? 'primary.main' : 'action.active' }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Attach file">
          <span>
            <IconButton size="small" onClick={() => fileInputRef.current?.click()} disabled={disabled || uploading}>
              <AttachFileIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <input ref={fileInputRef} type="file" accept="image/*,audio/*,video/*,.pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleFileChange} />

        <Box sx={{ flex: 1 }}>
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={!conversationId ? 'Select a conversation to start messaging…' : placeholder}
            disabled={disabled || !conversationId}
            rows={1}
            style={{
              width: '100%',
              minHeight: 42,
              maxHeight: 120,
              resize: 'none',
              border: '1px solid #e0e0e0',
              borderRadius: 20,
              padding: '10px 16px',
              fontSize: 14,
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
              lineHeight: 1.5,
              background: disabled || !conversationId ? '#f5f5f5' : '#fff',
              overflowY: 'auto',
            }}
          />
        </Box>

        <Tooltip title="Send (Enter)">
          <span>
            <IconButton
              size="medium"
              onClick={handleSend}
              disabled={!canSend}
              sx={{
                bgcolor: canSend ? 'primary.main' : 'grey.200',
                color: canSend ? 'white' : 'grey.400',
                '&:hover': { bgcolor: canSend ? 'primary.dark' : 'grey.200' },
                transition: 'all 0.2s',
                width: 40,
                height: 40,
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default MessageInput;
