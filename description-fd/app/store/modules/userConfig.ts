import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UserConfigState {
  language: string;
}

const initialState: UserConfigState = {
  language: "",
};

const userConfigSlice = createSlice({
  name: "userConfig",
  initialState,
  reducers: {
    setUserConfigLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
  },
});

export const { setUserConfigLanguage } = userConfigSlice.actions;

const reducer = userConfigSlice.reducer;
export default reducer;
