import { createSlice } from '@reduxjs/toolkit';
import type {  PayloadAction } from "@reduxjs/toolkit";

interface NotificationState {
  message: string | null;
  description?: string;
  type: 'success' | 'error' | 'info' | 'warning' | null;
}

const initialState: NotificationState = {
  message: null,
  description: '',
  type: null,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    showNotification: (
      state,
      action: PayloadAction<{ message: string; description?: string; type: 'success' | 'error' | 'info' | 'warning' }>
    ) => {
      state.message = action.payload.message;
      state.description = action.payload.description;
      state.type = action.payload.type;
    },
    clearNotification: (state) => {
      state.message = null;
      state.description = '';
      state.type = null;
    },
  },
});

export const { showNotification, clearNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
