import { configureStore } from "@reduxjs/toolkit";
import userConfigSlice from "./modules/userConfig";

const store = configureStore({
  reducer: {
    userConfig: userConfigSlice,
  },
});

export default store;
