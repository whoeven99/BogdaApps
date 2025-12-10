import userConfigSlice from "./modules/userConfig";
import { configureStore } from "@reduxjs/toolkit";
import productSlice from "./modules/productSlice";
import artilceSlice from "./modules/articleSlice";
const store = configureStore({
  reducer: {
    userConfig: userConfigSlice,
    product: productSlice,
    article: artilceSlice,
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
