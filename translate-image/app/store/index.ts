import userConfigSlice from "./modules/userConfig";
import { configureStore } from "@reduxjs/toolkit";
import productSlice from "./modules/productSlice";
const store = configureStore({
  reducer: {
    userConfig: userConfigSlice,
    product: productSlice,
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
