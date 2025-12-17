import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Language {
  locale: string;
  name: string;
  primary: boolean;
  published: boolean;
}

interface LanguageState {
  languageList: Language[];
}

const initialState: LanguageState = {
  languageList: [],
};

const languageSlice = createSlice({
  name: "language",
  initialState,
  reducers: {
    setLanguageList(state, action: PayloadAction<Language[]>) {
      state.languageList = action.payload;
    },
    resetLanguageState() {
      return initialState;
    },
  },
});

export const { setLanguageList, resetLanguageState } = languageSlice.actions;
export default languageSlice.reducer;
