import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/Layout/MainLayout';
import PageHeader from '../components/Common/PageHeader';
import ChatLayout from '../components/Messenger/ChatLayout';
import ConversationList from '../components/Messenger/ConversationList';
import MessageList from '../components/Messenger/MessageList';
import MessageInput from '../components/Messenger/MessageInput';
import { useSettings } from '../context/SettingsContext';
import io from 'socket.io-client';
import NewConversationDialog from '../components/Messenger/NewConversationDialog';
import AddIcon from '@mui/icons-material/Add';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';

function MessagesPage() {
  const { user, token } = useAuth();
  const { settings, refreshSettings } = useSettings();
  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [usersOnline, setUsersOnline] = useState(new Set());
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [conversation, setConversation] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const pageRef = useRef(1);

  // Load initial data
  useEffect(() => {
    if (token && user?._id) {
      loadConversations();
      loadUsers();
    }
  }, [token, user?._id]);

  // Socket connection
  useEffect(() => {
    if (!token || !user?._id) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      newSocket.emit('authenticate', token, (response) => {
        if (response.success) {
          newSocket.emit('user_online', user._id);
          loadConversations();
        }
      });
    });

    newSocket.on('new_message', (message) => {
      if (message.conversation.toString() === selectedConversationId) {
        setMessages(prev => [message, ...prev]);
      }
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv._id.toString() === message.conversation.toString()) {
            return { ...conv, lastMessage: message, lastMessageAt: message.createdAt };
          }
          return conv;
        });
        updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        return updated;
      });
    });

    newSocket.on('user_typing', ({ userId, conversationId, isTyping }) => {
      if (conversationId === selectedConversationId) {
        console.log(`User ${userId} ${isTyping ? 'typing' : 'stopped typing'}`);
      }
    });

    newSocket.on('user_status', ({ userId, status }) => {
      if (status === 'online') {
        setUsersOnline(prev => new Set([...prev, userId]));
      } else {
        setUsersOnline(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [token, user?._id]);

  // Load all users for new chat dialog
  const loadUsers = useCallback(async (search = '') => {
    try {
      const url = new URL(`${API_BASE}/messages/users`);
      if (search) url.searchParams.append('search', search);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAllUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }, [token]);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      // Calculate unread counts
      const counts = {};
      data.forEach(conv => {
        const userUnread = conv.unreadCounts?.find(u => u.user._id === user._id);
        counts[conv._id] = userUnread?.count || 0;
      });
      setUnreadCounts(counts);
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, [token, user._id]);

  const loadMessages = useCallback(async (conversationId, page = 1) => {
    try {
      const res = await fetch(`${API_BASE}/messages/conversations/${conversationId}/messages?page=${page}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (page === 1) {
        setMessages(data.messages);
      } else {
        setMessages(prev => [...data.messages, ...prev]);
      }
      setHasMoreMessages(data.hasMore);
      pageRef.current = page;
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, [token]);

  const handleSelectConversation = useCallback(async (conversationId) => {
    setSelectedConversationId(conversationId);
    setMobileOpen(false);
    pageRef.current = 1;
    loadMessages(conversationId, 1);
    
    // Get conversation details
    try {
      const res = await fetch(`${API_BASE}/messages/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const conv = await res.json();
      setConversation(conv);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
    
    // Mark as read
    if (socket) {
      socket.emit('read_messages', conversationId);
    }
  }, [loadMessages, token, socket]);

  const handleNewChatOpen = () => setNewChatOpen(true);
  const handleNewChatClose = () => setNewChatOpen(false);

  const handleCreate1to1 = (user) => {
    // Find or create 1-1 conversation
    const existingConv = conversations.find(conv => 
      conv.participants.length === 2 && 
      conv.participants.some(p => p._id === user._id)
    );
    if (existingConv) {
      handleSelectConversation(existingConv._id);
    } else {
      // Create new
      fetch(`${API_BASE}/messages/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ participants: [user._id], isGroup: false })
      }).then(res => res.json()).then(newConv => {
        handleSelectConversation(newConv._id);
      });
    }
  };

  const handleCreateGroup = async (groupData) => {
    try {
      const res = await fetch(`${API_BASE}/messages/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(groupData)
      });
      const newConv = await res.json();
      handleSelectConversation(newConv._id);
      loadConversations(); // Refresh list
    } catch (err) {
      console.error('Group creation failed:', err);
    }
  };

  const handleBroadcast = async () => {
    try {
      const res = await fetch(`${API_BASE}/messages/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: 'Broadcast message' })
      });
      const data = await res.json();
      handleSelectConversation(data.conversation._id);
    } catch (err) {
      console.error('Broadcast failed:', err);
    }
  };

  const handleReplyTo = (message) => {
    setReplyToMessage(message);
  };

  const handleSendMessage = useCallback(async (messageData) => {
    if (socket && selectedConversationId) {
      socket.emit('send_message', { 
        ...messageData, 
        conversationId: selectedConversationId 
      });
    }
  }, [socket, selectedConversationId]);

  const handleLoadMore = useCallback(() => {
    if (hasMoreMessages && !isLoadingMore) {
      setIsLoadingMore(true);
      const nextPage = pageRef.current + 1;
      loadMessages(selectedConversationId, nextPage).finally(() => {
        setIsLoadingMore(false);
      });
    }
  }, [hasMoreMessages, isLoadingMore, loadMessages, selectedConversationId]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserSearchChange = (e) => {
    const value = e.target.value;
    setUserSearch(value);
    loadUsers(value);
  };

  const filteredConversations = conversations.filter(conv => 
    conv.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
    conv.participants.some(p => p.name?.toLowerCase().includes(searchValue.toLowerCase()))
  );

  return (
    <>
      <MainLayout title="Messages">
        <PageHeader
          title="Messages"
          subtitle="Team communication & realtime messaging"
          icon={null}
          color="#0084ff"
          actions={null}
        />
        <ChatLayout
          conversation={conversation}
          onBack={() => setSelectedConversationId(null)}
          conversations={filteredConversations}
          selectedConversationId={selectedConversationId}
          unreadCounts={unreadCounts}
          totalUnread={Object.values(unreadCounts).reduce((a,b) => a + b, 0)}
          onNewChat={handleNewChatOpen}
          onSelectConversation={handleSelectConversation}
          searchValue={searchValue}
          onSearchChange={(e) => setSearchValue(e.target.value)}
          mobileOpen={mobileOpen}
          onDrawerToggle={handleDrawerToggle}
        >
          <ConversationList 
            conversations={filteredConversations}
            selectedConversationId={selectedConversationId}
            unreadCounts={unreadCounts}
            onSelectConversation={handleSelectConversation}
            searchValue={searchValue}
            onSearchChange={(e) => setSearchValue(e.target.value)}
            usersOnline={usersOnline}
            users={allUsers}
            userLoading={false}
            onNewChat={handleNewChatOpen}
          />
          <MessageList
            messages={messages}
            currentUserId={user?._id}
            usersOnline={usersOnline}
            hasMore={hasMoreMessages}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
            onReplyTo={handleReplyTo}
          />
          <MessageInput
            onSendMessage={handleSendMessage}
            socket={socket}
            conversationId={selectedConversationId}
            currentUserId={user?._id}
            replyTo={replyToMessage}
          />
        </ChatLayout>
      </MainLayout>
      
      <NewConversationDialog
        open={newChatOpen}
        onClose={handleNewChatClose}
        onCreate1to1={handleCreate1to1}
        onCreateGroup={handleCreateGroup}
        onBroadcast={handleBroadcast}
        users={allUsers}
        loading={false}
      />
    </>
  );
}

export default MessagesPage;

