import React from 'react';
import { 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Avatar, 
  Typography, 
  Box, 
  TextField, 
  Divider,
  Badge 
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';

import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import NewConversationDialog from './NewConversationDialog';

const ConversationList = ({
  conversations = [],
  selectedConversationId,
  unreadCounts = {},
  onSelectConversation,
  searchValue,
  onSearchChange,
  usersOnline = new Set(),
  onNewChat,
  users = [],
  userLoading = false
}) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [newChatDialogOpen, setNewChatDialogOpen] = React.useState(false);
  const newChatMenuOpen = Boolean(anchorEl);

  const handleNewChatClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNew1to1 = (user) => {
    onSelectConversation(user);
    setNewChatDialogOpen(false);
  };

  const handleNewGroup = async (groupData) => {
    try {
      // Create group via API
      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData)
      });
      const newConv = await response.json();
      onSelectConversation(newConv._id);
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const handleBroadcast = () => {
    // Trigger broadcast flow
    setNewChatDialogOpen(false);
  };

  return (
    <Box sx={{ p: 1 }}>
      {/* Actions + Search */}
      <Box sx={{ mb: 2, px: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <IconButton 
            onClick={() => setNewChatDialogOpen(true)}
            size="small"
            sx={{ flexGrow: 1 }}
          >
            <Typography variant="button">New Chat</Typography>
          </IconButton>
        </Box>
        <TextField
          fullWidth
          size="small"
          placeholder="Search conversations..."
          value={searchValue}
          onChange={onSearchChange}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, my: 0.5 }} />
          }}
          sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
        />
        <NewConversationDialog
          open={newChatDialogOpen}
          onClose={() => setNewChatDialogOpen(false)}
          onCreate1to1={handleNew1to1}
          onCreateGroup={handleNewGroup}
          onBroadcast={handleBroadcast}
          users={users}
          loading={userLoading}
        />
      </Box>
      
      <List sx={{ py: 0 }}>
        {conversations.map((conv) => {
          const unreadCount = unreadCounts[conv._id] || 0;
          const isSelected = selectedConversationId === conv._id;
          const isOnline = Array.from(usersOnline).some(id => 
            conv.participants.some(p => p._id === id && p._id !== conv.createdBy?._id)
          );

          return (
            <React.Fragment key={conv._id}>
              <ListItem
                button
                selected={isSelected}
                onClick={() => onSelectConversation(conv._id)}
                sx={{ 
                  borderRadius: 2, 
                  mx: 1,
                  my: 0.5,
                  '&:hover': { bgcolor: 'action.hover' },
                  '&.Mui-selected': {
                    bgcolor: 'primary.50',
                    '&:hover': { bgcolor: 'primary.100' }
                  }
                }}
              >
                <ListItemAvatar sx={{ minWidth: 56 }}>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                    color={isOnline ? "success" : "default"}
                  >
                    <Avatar sx={{ width: 48, height: 48 }}>
                      {conv.isGroup 
                        ? conv.name?.[0]?.toUpperCase() || 'G'
                        : (conv.participants?.find(p => p._id !== userId)?.name || 'U')[0]?.toUpperCase()
                      }
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ fontWeight: 600, display: 'block' }}
                      >
                        {conv.isGroup 
                          ? conv.name 
                          : (conv.participants?.find(p => p._id !== userId)?.name || 'Unknown')
                        }
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary" 
                        sx={{ display: 'block' }}
                      >
                        {conv.lastMessage?.content?.length > 30 
                          ? conv.lastMessage.content.substring(0, 30) + '...' 
                          : conv.lastMessage?.content || 'No messages'
                        }
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                      {unreadCount > 0 && (
                        <Badge badgeContent={unreadCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem' } }} />
                      )}
                    </Box>
                  }
                  primaryTypographyProps={{ sx: { fontSize: '0.95rem' } }}
                  secondaryTypographyProps={{ sx: { fontSize: '0.8rem' } }}
                />
              </ListItem>
              <Divider variant="inset" component="li" />
            </React.Fragment>
          );
        })}
      </List>
      
      {conversations.length === 0 && (
        <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">No conversations yet</Typography>
          <Typography variant="caption">Start a new chat to get started</Typography>
        </Box>
      )}
    </Box>
  );
};

export default ConversationList;
