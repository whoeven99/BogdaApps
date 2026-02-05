import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: {
    data: any[]
    state: "success" | "pending" | "null" | "error"
} = {
    data: [],
    state: "null"
}

const previewProductModalDataSlice = createSlice({
    name: "previewProductModalData",
    initialState,
    reducers: {
        setPreviewProductModalData: (state, action: PayloadAction<any[]>) => {
            state.data = action.payload;
        },
        addPreviewProductModalData: (state, action: PayloadAction<any>) => {
            state.data.push(action.payload);
        },
        batchAddPreviewProductModalData: (state, action: PayloadAction<any>) => {
            state.data.push(...action.payload);
        },
        setPreviewProductModalState: (state, action: PayloadAction<"success" | "pending" | "null" | "error">) => {
            state.state = action.payload;
        },
    },
});

export const {
    setPreviewProductModalData,
    addPreviewProductModalData,
    batchAddPreviewProductModalData,
    setPreviewProductModalState
} = previewProductModalDataSlice.actions;

const reducer = previewProductModalDataSlice.reducer;
export default reducer;
