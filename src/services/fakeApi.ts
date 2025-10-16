// src/api/fakeAuthApi.ts
export interface User {
  id: number;
  username: string;
  name: string;
  role: "admin" | "user";
}

export const fakeAuthApi = {
  login: async (username: string, password: string): Promise<{ token: string; user: User }> => {
    if (username === "admin" && password === "123456") {
      return {
        token: "fake-jwt-token",
        user: { id: 1, username, name: "Admin User", role: "admin" },
      };
    }
    if (username === "user" && password === "123456") {
      return {
        token: "fake-jwt-token",
        user: { id: 2, username, name: "Normal User", role: "user" },
      };
    }
    throw new Error("Sai tài khoản hoặc mật khẩu");
  },

  me: async (): Promise<User> => {
    return { id: 1, username: "admin", name: "Admin User", role: "admin" };
  },
};
