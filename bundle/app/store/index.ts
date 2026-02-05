import offersDataSlice from "./modules/offersData";
import { configureStore } from "@reduxjs/toolkit";
import previewProductModalDataSlice from "./modules/previewProductModalData";

const store = configureStore({
  reducer: {
    offersData: offersDataSlice,
    previewProductModalData: previewProductModalDataSlice,
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
