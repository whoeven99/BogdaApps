import userConfigSlice from "./modules/userConfig";
import { configureStore } from "@reduxjs/toolkit";

const store = configureStore({
  reducer: {
    userConfig: userConfigSlice,
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
