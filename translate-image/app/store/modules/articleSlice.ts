import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ArticlePageCursorInfo {
  articlesHasNextPage: boolean;
  articlesHasPreviousPage: boolean;
  articlesStartCursor: string;
  articlesEndCursor: string;
  lastRequestCursor: string;
  direction:string;
  searchText: string;
  sortOrder: "asc" | "desc";
  sortKey: string;
}

interface ArticleState {
  lastPageCursorInfo: ArticlePageCursorInfo;
}

const initialState: ArticleState = {
  lastPageCursorInfo: {
    articlesHasNextPage: false,
    articlesHasPreviousPage: false,
    articlesStartCursor: "",
    articlesEndCursor: "",
    lastRequestCursor: "",
    direction:"",
    searchText: "",
    sortOrder: "desc",
    sortKey: "AUTHOR",
  },
};

const artilceSlice = createSlice({
  name: "article",
  initialState,
  reducers: {
    setLastPageCursorInfo(
      state,
      action: PayloadAction<Partial<ArticlePageCursorInfo>>,
    ) {
      state.lastPageCursorInfo = {
        ...state.lastPageCursorInfo,
        ...action.payload,
      };
    },
    resetArticleState() {
      return initialState;
    },
  },
});

export const { setLastPageCursorInfo, resetArticleState } =
  artilceSlice.actions;
export default artilceSlice.reducer;
