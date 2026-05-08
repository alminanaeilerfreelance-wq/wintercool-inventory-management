import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  Paper,
  EmojiEmotions,
  AttachFile,
  Mic,
  Send,
  PhotoCamera,
  KeyboardArrowUp
} from '@mui/material';
import Picker from 'emoji-picker-react';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

const MessageInput = ({
  onSendMessage,
  onFileUpload,
  placeholder = "Type a message...",
  disabled = false,
  socket,
  conversationId,
  currentUserId,
  uploading = false
}) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [typing, setTyping] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const inputRef = useRef();
  const mediaRecorderRef = useRef();
  const fileInputRef = useRef();

  const handleSend = async () => {
    if (message.trim() && !uploading) {
      try {
        onSendMessage({
          conversationId,
          content: message.trim(),
          type: 'text'
        });
        setMessage('');
        inputRef.current.focus();
      } catch (error) {
        console.error('Send failed:', error);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emojiObject) => {
    setMessage(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const toggleTyping = () => {
    if (socket && conversationId) {
      const typingState = !typing;
      setTyping(typingState);
      socket.emit('typing', { conversationId, isTyping: typingState });
      
      // Auto-stop typing after 3 seconds or when typing stops
      setTimeout(() => setTyping(false), 3000);
    }
  };

  const handleInput = () => {
    toggleTyping();
  };

  const handleAudioRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Upload audio file then send
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice-message.webm');
        
        // For demo, create temp audio message
        onSendMessage({
          conversationId,
          type: 'audio',
          file: { url: audioUrl, blob: audioBlob }
        });
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Auto-stop after 60 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 60000);
    } catch (err) {
      console.error('Audio recording failed:', err);
    }
  };

  return (
    <Paper
      elevation={8}
      sx={{
        p: 1.5,
        borderRadius: '24px',
        mx: 2,
        mb: 2,
        position: 'sticky',
        bottom: 0,
        bgcolor: 'background.paper'
      }}
    >
      <Box sx={{ position: 'relative' }}>
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <Box sx={{ 
            position: 'absolute', 
            bottom: '100%', 
            right: 0,
            zIndex: 1300,
            mb: 1
          }}>
            <Picker onEmojiClick={handleEmojiClick} />
          </Box>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
          <IconButton 
            size="small"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <AttachFileIcon fontSize="small" />
          </IconButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files[0];
              if (file && !uploading) {
                try {
                  setFilePreview(URL.createObjectURL(file));
                  
                  // Upload to backend
                  const formData = new FormData();
                  formData.append('file', file);
                  
                  const uploadResponse = await fetch('/api/messages/upload', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('wms_token')}`
                    },
                    body: formData
                  });
                  
                  const { file: uploadedFile } = await uploadResponse.json();
                  
                  onSendMessage({
                    conversationId,
                    type: file.type.startsWith('image/') ? 'image' : 
                          file.type.startsWith('audio/') ? 'audio' : 
                          file.type.startsWith('video/') ? 'video' : 'file',
                    file: uploadedFile,
                    content: file.name
                  });
                  
                  setFilePreview(null);
                  e.target.value = '';
                } catch (error) {
                  console.error('Upload failed:', error);
                  setFilePreview(null);
                  e.target.value = '';
                }
              }
            }}
          />
          
          <IconButton 
            size="small"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <EmojiEmotions fontSize="small" />
          </IconButton>

          <Box sx={{ flexGrow: 1, position: 'relative' }}>
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              onInput={handleInput}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              style={{
                width: '100%',
                minHeight: '42px',
                maxHeight: '120px',
                resize: 'none',
                border: '1px solid #e0e0e0',
                borderRadius: '20px',
                padding: '12px 16px',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </Box>

          {(isRecording || message.trim()) ? (
            <IconButton 
              onClick={isRecording ? () => {
                mediaRecorderRef.current.stop();
                setIsRecording(false);
              } : handleSend}
              sx={{ color: isRecording ? 'error.main' : 'primary.main' }}
            >
              {isRecording ? <KeyboardArrowUp /> : <Send />}
            </IconButton>
          ) : (
            <IconButton 
              onClick={handleAudioRecord}
              sx={{ color: 'text.secondary' }}
            >
              <Mic />
            </IconButton>
          )}
        </Box>
      </Box>
    </Paper>
  );

  return null;
};

export default MessageInput;
