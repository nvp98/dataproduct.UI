import { createSlice } from '@reduxjs/toolkit';

interface LoadingState {
  global: boolean;
}

const initialState: LoadingState = {
  global: false,
};

const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    showLoading: (state) => {
      state.global = true;
    },
    hideLoading: (state) => {
      state.global = false;
    },
  },
});

export const { showLoading, hideLoading } = loadingSlice.actions;
export default loadingSlice.reducer;
