import client from './client';

// Boards
export const getBoards  = (p)    => client.get('/boards', { params: p }).then(r => r.data);
export const createBoard = (d)   => client.post('/boards', d).then(r => r.data);
export const getBoard   = (id)   => client.get(`/boards/${id}`).then(r => r.data);
export const updateBoard = (id, d) => client.patch(`/boards/${id}`, d).then(r => r.data);
export const deleteBoard = (id)  => client.delete(`/boards/${id}`).then(r => r.data);

// Columns
export const addColumn    = (bid, d)        => client.post(`/boards/${bid}/columns`, d).then(r => r.data);
export const updateColumn = (bid, cid, d)   => client.patch(`/boards/${bid}/columns/${cid}`, d).then(r => r.data);
export const deleteColumn = (bid, cid)      => client.delete(`/boards/${bid}/columns/${cid}`).then(r => r.data);

// Cards
export const createCard  = (bid, d)         => client.post(`/boards/${bid}/cards`, d).then(r => r.data);
export const updateCard  = (bid, cid, d)    => client.patch(`/boards/${bid}/cards/${cid}`, d).then(r => r.data);
export const deleteCard  = (bid, cid)       => client.delete(`/boards/${bid}/cards/${cid}`).then(r => r.data);
export const addChecklist   = (bid, cid, d) => client.post(`/boards/${bid}/cards/${cid}/checklist`, d).then(r => r.data);
export const toggleChecklist= (bid, cid, iid) => client.patch(`/boards/${bid}/cards/${cid}/checklist/${iid}`).then(r => r.data);

// Members
export const addBoardMember = (bid, d) => client.post(`/boards/${bid}/members`, d).then(r => r.data);
