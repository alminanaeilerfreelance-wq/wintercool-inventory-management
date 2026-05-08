import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';

import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import Paper from '@mui/material/Paper';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { useRef } from 'react';


import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TodayIcon from '@mui/icons-material/Today';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import InfoIcon from '@mui/icons-material/Info';
import BusinessIcon from '@mui/icons-material/Business';

import MainLayout from '../../components/Layout/MainLayout';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import PageHeader from '../../components/Common/PageHeader';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const COLOR_OPTIONS = [
  { label: 'Blue', value: '#1565c0' },
  { label: 'Green', value: '#2e7d32' },
  { label: 'Red', value: '#c62828' },
  { label: 'Orange', value: '#e65100' },
  { label: 'Purple', value: '#6a1b9a' },
  { label: 'Teal', value: '#00695c' },
  { label: 'Pink', value: '#ad1457' },
  { label: 'Brown', value: '#4e342e' },
];

const EMPTY_FORM = {
  title: '',
  description: '',
  startDate: dayjs().format('YYYY-MM-DDTHH:mm'),
  endDate: dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
  color: '#1565c0',
  storeBranch: '',
};

export default function CalendarPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const assignedBranchId = user?.assignedBranch?._id || user?.assignedBranch || '';

  const [currentDate, setCurrentDate] = useState(dayjs());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [branchesLoaded, setBranchesLoaded] = useState(false);

  const assignedBranchName = useMemo(() => {
    if (!assignedBranchId || !branches.length) return '';
    return branches.find(
      (branch) => branch._id === assignedBranchId || branch.id === assignedBranchId
    )?.name || '';
  }, [branches, assignedBranchId]);

  const [formOpen, setFormOpen] = useState(false);

  const [eventSearch, setEventSearch] = useState('');
  const [debouncedEventSearch, setDebouncedEventSearch] = useState('');
  const searchDebounceTimer = useRef(null);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const monthEventCount = events.length;
  const upcomingEvents = events
    .map((ev) => ({
      ...ev,
      startDateObj: dayjs(ev.startDate || ev.start),
      endDateObj: dayjs(ev.endDate || ev.end),
    }))
    .filter((ev) => {
      if (!ev.startDateObj.isValid()) return false;
      return ev.startDateObj.startOf('day').diff(dayjs().startOf('day'), 'day') >= 0;
    })
    .sort((a, b) => a.startDateObj.diff(b.startDateObj));

  const fetchBranches = useCallback(async () => {
    if (branchesLoaded) return;
    try {
      const res = await api.get('/store-branches');
      const d = res.data?.data || res.data;
      setBranches(Array.isArray(d) ? d : d?.items || []);
      setBranchesLoaded(true);
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  }, [branchesLoaded]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const startOfMonth = currentDate.startOf('month');
      const endOfMonth = currentDate.endOf('month');
      const res = await api.get('/calendar', {
        params: {
          start: startOfMonth.toISOString(),
          end: endOfMonth.toISOString(),
          ...(debouncedEventSearch ? { search: debouncedEventSearch } : {}),
        },
      });

      const data = res.data.data || res.data;
      const items = Array.isArray(data) ? data : data.items || data.events || [];
      setEvents(items);
    } catch {
      enqueueSnackbar('Failed to load events', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [currentDate, debouncedEventSearch, enqueueSnackbar]);


  useEffect(() => { fetchBranches(); }, [fetchBranches]);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Build calendar grid
  const buildCalendarGrid = () => {
    const startOfMonth = currentDate.startOf('month');
    const daysInMonth = currentDate.daysInMonth();
    // day of week: 0=Sun, 1=Mon... we want Mon=0
    let startDow = startOfMonth.day(); // 0=Sun
    startDow = startDow === 0 ? 6 : startDow - 1; // shift so Mon=0

    const cells = [];
    // empty cells before start
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = currentDate.date(day).format('YYYY-MM-DD');
    return events.filter((ev) => {
      const start = dayjs(ev.startDate || ev.start).format('YYYY-MM-DD');
      const end = dayjs(ev.endDate || ev.end).format('YYYY-MM-DD');
      return dateStr >= start && dateStr <= end;
    });
  };

  const openAdd = (day) => {
    const base = day ? currentDate.date(day) : dayjs();
    const defaultBranch = isAdmin ? '' : assignedBranchId;
    setFormData({
      ...EMPTY_FORM,
      startDate: base.format('YYYY-MM-DDTHH:mm'),
      endDate: base.add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
      storeBranch: defaultBranch,
    });
    setEditId(null);
    setFormOpen(true);
  };

  const openEdit = (ev) => {

    setFormData({
      title: ev.title || '',
      description: ev.description || '',
      startDate: ev.startDate ? dayjs(ev.startDate).format('YYYY-MM-DDTHH:mm') : ev.start || '',
      endDate: ev.endDate ? dayjs(ev.endDate).format('YYYY-MM-DDTHH:mm') : ev.end || '',
      color: ev.color || '#1565c0',
      storeBranch: ev.storeBranch?._id || ev.storeBranch || '',
    });
    setEditId(ev._id || ev.id);
    setDetailOpen(false);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title) { enqueueSnackbar('Title is required', { variant: 'warning' }); return; }
    setFormLoading(true);
    try {
      if (editId) {
        await api.put(`/calendar/${editId}`, formData);
        enqueueSnackbar('Event updated', { variant: 'success' });
      } else {
        await api.post('/calendar', formData);
        enqueueSnackbar('Event created', { variant: 'success' });
      }
      setFormOpen(false);
      fetchEvents();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Save failed', { variant: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/calendar/${deleteId}`);
      enqueueSnackbar('Event deleted', { variant: 'success' });
      setDeleteOpen(false);
      setDetailOpen(false);
      fetchEvents();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Delete failed', { variant: 'error' });
    }
  };

  const handleEventClick = (ev) => {
    setSelectedEvent(ev);
    setDetailOpen(true);
  };

  const cells = buildCalendarGrid();
  const today = dayjs();
  const isCurrentMonth = currentDate.isSame(today, 'month');

  return (
    <MainLayout title="Calendar">
      <PageHeader
        title="Calendar"
        subtitle={
          isAdmin
            ? `${events.length} event${events.length !== 1 ? 's' : ''} this month`
            : `${events.length} event${events.length !== 1 ? 's' : ''} for ${assignedBranchName || 'your branch'} this month`
        }
        icon={<CalendarMonthIcon />}
        color="#1565c0"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Calendar' }]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openAdd(null)}>
            Add Event
          </Button>
        }
      />

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} lg={8}>
          {!isAdmin && assignedBranchName && (
            <Alert severity="info" sx={{ mb: 2 }} icon={<BusinessIcon />}>
              You are viewing calendar events for <strong>{assignedBranchName}</strong> only. Contact an administrator to view or manage events for other branches.
            </Alert>
          )}
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Box sx={{ flex: 1 }}>

                  <Typography variant="subtitle1" fontWeight={700}>
                    {currentDate.format('MMMM YYYY')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {monthEventCount} event{monthEventCount !== 1 ? 's' : ''} this month
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end', minWidth: 240 }}>
                  <TextField
                    size="small"
                    placeholder="Search events"
                    value={eventSearch}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEventSearch(v);
                      if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
                      searchDebounceTimer.current = setTimeout(() => {
                        setDebouncedEventSearch(v);
                      }, 350);
                    }}
                    InputProps={{ sx: { borderRadius: 2, bgcolor: 'background.paper' } }}
                  />
                  {eventSearch && (
                    <Button
                      size="small"
                      onClick={() => {
                        setEventSearch('');
                        setDebouncedEventSearch('');
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </Box>

                <Stack direction="row" spacing={1}>
                  <Button

                    size="small"
                    variant="outlined"
                    startIcon={<ChevronLeftIcon />}
                    onClick={() => setCurrentDate((d) => d.subtract(1, 'month'))}
                  >
                    Prev
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    endIcon={<ChevronRightIcon />}
                    onClick={() => setCurrentDate((d) => d.add(1, 'month'))}
                  >
                    Next
                  </Button>
                  {!isCurrentMonth && (
                    <Button
                      size="small"
                      color="primary"
                      variant="contained"
                      startIcon={<TodayIcon />}
                      onClick={() => setCurrentDate(dayjs())}
                    >
                      Today
                    </Button>
                  )}
                </Stack>
              </Stack>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <Grid container columns={7} sx={{ mb: 1 }}>
                    {DAYS_OF_WEEK.map((d) => (
                      <Grid item xs={1} key={d}>
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          color="text.secondary"
                          sx={{ display: 'block', textAlign: 'center', py: 1 }}
                        >
                          {d}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>

                  <Divider sx={{ mb: 1 }} />

                  <Grid container columns={7} gap={0}>
                    {cells.map((day, idx) => {
                      const dayEvents = getEventsForDay(day);
                      const isToday = day && isCurrentMonth && today.date() === day;

                      return (
                        <Grid item xs={1} key={idx}>
                          <Box
                            sx={{
                              minHeight: 96,
                              border: '1px solid',
                              borderColor: 'divider',
                              p: 1,
                              bgcolor: day ? (isToday ? 'primary.50' : 'background.paper') : 'grey.100',
                              cursor: day ? 'pointer' : 'default',
                              '&:hover': day ? { bgcolor: 'action.hover' } : {},
                            }}
                            onClick={() => day && openAdd(day)}
                          >
                            {day && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography
                                  variant="subtitle2"
                                  fontWeight={isToday ? 700 : 600}
                                  sx={{
                                    width: 24,
                                    height: 24,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    bgcolor: isToday ? 'primary.main' : 'transparent',
                                    color: isToday ? 'common.white' : 'text.primary',
                                  }}
                                >
                                  {day}
                                </Typography>
                                {dayEvents.length > 0 && (
                                  <Chip
                                    label={`${dayEvents.length}`}
                                    size="small"
                                    color="primary"
                                  />
                                )}
                              </Box>
                            )}
                            <Stack spacing={0.5}>
                              {dayEvents.slice(0, 2).map((ev) => (
                                <Chip
                                  key={ev._id || ev.id}
                                  label={ev.title}
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); handleEventClick(ev); }}
                                  sx={{
                                    bgcolor: ev.color || '#1565c0',
                                    color: 'white',
                                    fontSize: 10,
                                    height: 22,
                                    '& .MuiChip-label': { px: 0.5 },
                                  }}
                                />
                              ))}
                              {dayEvents.length > 2 && (
                                <Typography variant="caption" color="text.secondary">
                                  +{dayEvents.length - 2} more
                                </Typography>
                              )}
                            </Stack>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <Paper elevation={2} sx={{ borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>
                This Month
              </Typography>
              <Typography variant="h4" fontWeight={800} mb={0.5}>
                {monthEventCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total events scheduled in {currentDate.format('MMMM')}.
              </Typography>
            </Paper>

            <Paper elevation={2} sx={{ borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>
                Upcoming Events
              </Typography>
              {upcomingEvents.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No upcoming events scheduled.
                </Typography>
              ) : (
                <List disablePadding>
                  {upcomingEvents.slice(0, 5).map((ev) => (
                    <ListItem
                      key={ev._id || ev.id}
                      button
                      onClick={() => handleEventClick(ev)}
                      sx={{ borderRadius: 2, mb: 1, bgcolor: 'background.paper' }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: ev.color || '#1565c0' }}>
                          {ev.title?.charAt(0) || 'E'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={ev.title}
                        secondary={`${ev.startDateObj.format('MMM DD, HH:mm')} • ${ev.endDateObj.format('HH:mm')}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>

            <Paper elevation={2} sx={{ borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>
                Event Legend
              </Typography>
              <Stack spacing={1}>
                {COLOR_OPTIONS.slice(0, 5).map((option) => (
                  <Box key={option.value} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, borderRadius: 0.5, bgcolor: option.value }} />
                    <Typography variant="body2">{option.label}</Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      {/* Add/Edit Form Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle>{editId ? 'Edit Event' : 'Add Event'}</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Start Date & Time"
              type="datetime-local"
              value={formData.startDate}
              onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date & Time"
              type="datetime-local"
              value={formData.endDate}
              onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel>Branch</InputLabel>
              <Select
                value={formData.storeBranch}
                label="Branch"
                onChange={(e) => setFormData((p) => ({ ...p, storeBranch: e.target.value }))}
              >
                {isAdmin && <MenuItem value=""><em>All Branches</em></MenuItem>}
                {branches.map((branch) => (
                  <MenuItem key={branch._id || branch.id} value={branch._id || branch.id}>
                    {branch.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setFormOpen(false)} disabled={formLoading} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={formLoading}
            startIcon={formLoading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {formLoading ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        {selectedEvent && (
          <>
            <DialogTitle>
              <Stack direction="row" alignItems="center" gap={1}>
                <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: selectedEvent.color || '#1565c0', flexShrink: 0 }} />
                {selectedEvent.title}
              </Stack>
            </DialogTitle>
            <Divider />
            <DialogContent>
              {selectedEvent.description && (
                <Typography variant="body2" mb={1}>{selectedEvent.description}</Typography>
              )}
              <Typography variant="caption" color="text.secondary" display="block">
                Start: {dayjs(selectedEvent.startDate || selectedEvent.start).format('MMM DD, YYYY HH:mm')}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                End: {dayjs(selectedEvent.endDate || selectedEvent.end).format('MMM DD, YYYY HH:mm')}
              </Typography>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 2, py: 1 }}>
              <Button onClick={() => setDetailOpen(false)} color="inherit" size="small">Close</Button>
              <Button
                startIcon={<EditIcon />}
                size="small"
                color="warning"
                onClick={() => openEdit(selectedEvent)}
              >
                Edit
              </Button>
              <Button
                startIcon={<DeleteIcon />}
                size="small"
                color="error"
                onClick={() => { setDeleteId(selectedEvent._id || selectedEvent.id); setDeleteOpen(true); setDetailOpen(false); }}
              >
                Delete
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete Confirm */}
      <AdminConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Event"
        description="Are you sure you want to delete this event? Enter admin password to confirm."
      />
    </MainLayout>
  );
}
