import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  TextField,
  Typography,
  Divider,
  CircularProgress,
  Box
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';

const UserList = ({ 
  users = [], 
  loading = false, 
  onSelectUser,
  selectedUsers = [],
  searchValue,
  onSearchChange,
  usersOnline = new Set()
}) => {
  const { token } = useAuth();

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    user.username.toLowerCase().includes(searchValue.toLowerCase()) ||
    user.email.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search users..."
          value={searchValue}
          onChange={onSearchChange}
          InputProps={{
            startAdornment: null
          }}
        />
      </Box>
      
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : filteredUsers.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">No users found</Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {filteredUsers.map((user) => {
              const isSelected = selectedUsers.some(su => su._id === user._id);
              const isOnlineUser = usersOnline.has(user._id);

              return (
                <React.Fragment key={user._id}>
                  <ListItem
                    button
                    selected={isSelected}
                    onClick={() => onSelectUser(user)}
                    sx={{ 
                      '&.Mui-selected': { bgcolor: 'primary.50' },
                      '&.Mui-selected:hover': { bgcolor: 'primary.100' }
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        overlap="circular"
                        variant="dot"
                        color={isOnlineUser ? "success" : "default"}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      >
                        <Avatar sx={{ width: 44, height: 44 }}>
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            user.name.charAt(0).toUpperCase()
                          )}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" fontWeight={600}>
                          {user.name || user.username}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.primary">
                            {user.role?.toUpperCase()}
                          </Typography>
                          {user.email && (
                            <Typography variant="caption" display="block" color="text.secondary" noWrap>
                              {user.email}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default UserList;

