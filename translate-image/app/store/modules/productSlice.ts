import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ProductPageCursorInfo {
  productsHasNextPage: boolean;
  productsHasPreviousPage: boolean;
  productsStartCursor: string;
  productsEndCursor: string;
  searchText: string;
  activeKey: string;
  sortOrder: "asc" | "desc";
  sortKey: string;
}

interface ProductState {
  lastPageCursorInfo: ProductPageCursorInfo;
}

const initialState: ProductState = {
  lastPageCursorInfo: {
    productsHasNextPage: false,
    productsHasPreviousPage: false,
    productsStartCursor: "",
    productsEndCursor: "",
    searchText: "",
    activeKey: "",
    sortOrder: "desc",
    sortKey: "TITLE",
  },
};

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {
    setLastPageCursorInfo(state, action: PayloadAction<Partial<ProductPageCursorInfo>>) {
      state.lastPageCursorInfo = {
        ...state.lastPageCursorInfo,
        ...action.payload,
      };
    },
    resetProductState() {
      return initialState;
    },
  },
});

export const { setLastPageCursorInfo, resetProductState } = productSlice.actions;
export default productSlice.reducer;
