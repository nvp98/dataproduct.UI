import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: "admin" | "user";
}

interface AuthState {
  [x: string]: any;
  isLoggedIn: boolean;
  token: string | null;
  user: AuthUser | null;
}

const initialState: AuthState = {
  isLoggedIn: false,
  token: null,
  user: null,
};
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<{ token: string; user: AuthUser }>) => {
      state.isLoggedIn = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.token = null;
      state.user = null;
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
