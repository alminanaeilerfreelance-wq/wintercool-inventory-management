import api from './api';

export const unlockUser = (id) => api.put(`/users/${id}/unlock`);

