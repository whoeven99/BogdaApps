import offersDataSlice from "./modules/offersData";
import { configureStore } from "@reduxjs/toolkit";

const store = configureStore({
  reducer: {
    offersData: offersDataSlice,
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
