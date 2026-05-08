import React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import useMediaQuery from '@mui/material/useMediaQuery';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useSettings } from '../../context/SettingsContext';

const ChatLayout = ({ 
  children, 
  conversation, 
  onBack, 
  conversations, 
  selectedConversationId, 
  unreadCounts = {},
  totalUnread = 0,
  onNewChat,
  onDrawerToggle,
  mobileOpen,
  searchValue,
  onSearchChange
}) => {
  const { settings } = useSettings();
  const isMobile = useMediaQuery('(max-width: 900px)');
  const drawerWidth = 360;

  const totalNotifications = Object.values(unreadCounts).reduce((sum, count) => sum + (count || 0), 0);

  const drawerContent = (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Typography variant="h6" fontWeight={600}>
          Messages
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={onNewChat} size="small">
            <AddIcon />
          </IconButton>
          <Badge badgeContent={totalNotifications || 0} color="error" max={99}>
            <IconButton>
              <NotificationsIcon />
            </IconButton>
          </Badge>
        </Box>
      </Box>
      <Box sx={{ flex: 1, p: 1, overflow: 'hidden' }}>
        {children[0]}
      </Box>
    </Box>
  );


  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Conversation Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={mobileOpen || !isMobile}
        onClose={onDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: 'none'
          }
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Chat Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar 
          position="static" 
          elevation={0}
          color="default"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            color: 'text.primary'
          }}
        >
          <Toolbar sx={{ minHeight: 72 }}>
            {isMobile && (
              <IconButton 
                edge="start" 
                color="inherit" 
                onClick={onDrawerToggle}
                sx={{ mr: 1 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            {conversation ? (
              <>
                <IconButton edge="start" color="inherit" onClick={onBack} sx={{ mr: 1 }}>
                  <ArrowBackIcon />
                </IconButton>
                <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                  <Avatar sx={{ width: 44, height: 44, mr: 2 }}>
                    {conversation.isGroup 
                      ? conversation.name?.[0]?.toUpperCase() || 'G'
                      : conversation.participants?.find(p => p._id !== conversation.createdBy?._id)?.name?.[0]?.toUpperCase() || 'U'
                    }
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600} noWrap>
                      {conversation.name || conversation.participants?.[1]?.name || 'Loading...'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {conversation.participants?.length || 0} members
                      {conversation.isGroup && ', Group chat'}
                    </Typography>
                  </Box>
                </Box>
                <IconButton color="inherit">
                  <SearchIcon />
                </IconButton>
                <IconButton color="inherit">
                  <MoreVertIcon />
                </IconButton>
              </>
            ) : (
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Select a conversation
              </Typography>
            )}
          </Toolbar>
        </AppBar>
        
        {/* Message Area */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {children[1]}
        </Box>
      </Box>
    </Box>
  );
};

export default ChatLayout;
