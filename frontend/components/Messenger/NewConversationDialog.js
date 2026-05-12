import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  Chip,
  Autocomplete,
  CircularProgress,
  Typography,
  Divider,
  IconButton,
  Box
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

const NewConversationDialog = ({
  open,
  onClose,
  onCreate1to1,
  onCreateGroup,
  onBroadcast,
  users = [],
  loading = false
}) => {
  const [tab, setTab] = useState('1to1'); // '1to1', 'group', 'broadcast'
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchText, setSearchText] = useState('');

  const filteredUsers = users.filter(user => 
    !selectedUsers.some(su => su._id === user._id) &&
    (user.name || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const handleCreate1to1 = () => {
    if (selectedUsers.length === 1) {
      onCreate1to1(selectedUsers[0]);
      // Ensure dialog closes
      handleClose();
    }
  };

  const handleCreateGroup = () => {
    if (groupName && selectedUsers.length > 1) {
      onCreateGroup({ name: groupName, participants: selectedUsers.map(u => u._id) });
      handleClose();
    }
  };

  const handleBroadcast = () => {
    onBroadcast();
    handleClose();
  };

  const handleClose = () => {
    setSelectedUsers([]);
    setGroupName('');
    setSearchText('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => setTab('1to1')} sx={{ color: tab === '1to1' ? 'primary.main' : 'action.active' }}>
            <PersonAddIcon />
          </IconButton>
          <IconButton onClick={() => setTab('group')} sx={{ color: tab === 'group' ? 'primary.main' : 'action.active' }}>
            <GroupAddIcon />
          </IconButton>
        </Box>
        <Typography variant="h6" mt={1}>
          {tab === 'broadcast' ? 'Broadcast Message' : 
           tab === 'group' ? 'New Group' : 'New Message'}
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 0, pb: 0 }}>
        {tab === '1to1' && (
          <Box sx={{ mt: 1 }}>
            <Autocomplete
              multiple
              limitTags={2}
              options={users}
              getOptionLabel={(user) => user.name || user.username}
              value={selectedUsers}
              onChange={(_, value) => setSelectedUsers(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select user"
                  placeholder="Search users..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option.name} size="small" {...getTagProps({ index })} />
                ))
              }
              sx={{ mt: 1 }}
              disableCloseOnSelect
            />
          </Box>
        )}

        {tab === 'group' && (
          <>
            <TextField
              fullWidth
              label="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              sx={{ mt: 1 }}
            />
            <Autocomplete
              multiple
              limitTags={3}
              options={users}
              getOptionLabel={(user) => user.name || user.username}
              value={selectedUsers}
              onChange={(_, value) => setSelectedUsers(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Add members"
                  placeholder="Type to search..."
                  sx={{ mt: 2 }}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              )}
              sx={{ mt: 1 }}
              disableCloseOnSelect
            />
          </>
        )}

        {tab === 'broadcast' && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Send message to all active users
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {tab === '1to1' && (
          <Button 
            onClick={handleCreate1to1} 
            disabled={selectedUsers.length !== 1 || loading}
          >
            Chat
          </Button>
        )}
        {tab === 'group' && (
          <Button 
            onClick={handleCreateGroup} 
            disabled={!groupName || selectedUsers.length < 2 || loading}
          >
            Create Group
          </Button>
        )}
        {tab === 'broadcast' && (
          <Button 
            onClick={handleBroadcast} 
            disabled={loading}
          >
            Broadcast
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default NewConversationDialog;

