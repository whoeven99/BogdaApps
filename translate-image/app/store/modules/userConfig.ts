import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UserConfigState {
  shop: string;
  locale: string;
  plan: {
    id: number;
    type: string;
    feeType: number;
    isInFreePlanTime: boolean;
  };
  updateTime: string | null;
  chars: number | undefined;
  totalChars: number | undefined;
  userConfigIsLoading: boolean;
  isNew: boolean | null;
}

const initialState: UserConfigState = {
  shop: "",
  locale: "",
  plan: {
    id: 0,
    type: "",
    feeType: 0,
    isInFreePlanTime: false,
  },
  updateTime: null,
  chars: 0,
  totalChars: 0,
  userConfigIsLoading: true,
  isNew: null,
};

const userConfigSlice = createSlice({
  name: "userConfig",
  initialState,
  reducers: {
    setPlan: (
      state,
      action: PayloadAction<{
        plan: {
          id: number;
          type: string;
          feeType: number;
          isInFreePlanTime: boolean;
        };
      }>,
    ) => {
      state.plan = action.payload.plan;
    },
    setUpdateTime: (state, action: PayloadAction<{ updateTime: string }>) => {
      state.updateTime = action.payload.updateTime;
    },
    setShop: (state, action: PayloadAction<{ shop: string }>) => {
      state.shop = action.payload.shop;
    },
    setLocale: (state, action: PayloadAction<{ locale: string }>) => {
      state.locale = action.payload.locale;
    },
    setChars: (state, action: PayloadAction<{ chars: number | undefined }>) => {
      state.chars = action.payload.chars;
    },
    setTotalChars: (
      state,
      action: PayloadAction<{ totalChars: number | undefined }>,
    ) => {
      state.totalChars = action.payload.totalChars;
    },
    setUserConfigIsLoading: (
      state,
      action: PayloadAction<{ isLoading: boolean }>,
    ) => {
      state.userConfigIsLoading = action.payload.isLoading;
    },
    setIsNew: (state, action: PayloadAction<{ isNew: boolean }>) => {
      state.isNew = action.payload.isNew;
    },
  },
});

export const {
  setPlan,
  setUpdateTime,
  setShop,
  setLocale,
  setChars,
  setTotalChars,
  setUserConfigIsLoading,
  setIsNew,
} = userConfigSlice.actions;

const reducer = userConfigSlice.reducer;
export default reducer;
