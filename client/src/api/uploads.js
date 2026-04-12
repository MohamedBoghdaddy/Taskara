import client from './client';

const upload = (endpoint, file, extra = {}) => {
  const form = new FormData();
  form.append('file', file);
  Object.entries(extra).forEach(([k, v]) => form.append(k, v));
  return client.post(endpoint, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};

export const uploadAttachment = (file, entityId, entityType) =>
  upload('/uploads/attachment', file, { entityId: entityId || '', entityType: entityType || 'Task' });

export const uploadAvatar   = (file) => upload('/uploads/avatar', file);
export const uploadAudio    = (file) => upload('/uploads/audio', file);
export const getAttachments = (entityId) => client.get(`/uploads/entity/${entityId}`).then(r => r.data);
export const deleteUpload   = (id)   => client.delete(`/uploads/${id}`).then(r => r.data);
