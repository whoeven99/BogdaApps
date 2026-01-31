import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { OfferType } from "app/types";

const initialState: OfferType[] = []

const offersDataSlice = createSlice({
    name: "offersData",
    initialState,
    reducers: {
        setOffersData: (_state, action: PayloadAction<OfferType[]>) => {
            return action.payload;
        },
        addOffer: (state, action: PayloadAction<OfferType>) => {
            state.push(action.payload);
        },
        upDateOffer: (state, action: PayloadAction<OfferType>) => {
            return state.map((offer) =>
                offer.id === action.payload.id ? action.payload : offer
            );
        },
        removeOffer: (state, action: PayloadAction<string>) => {
            return state.filter((offer) => offer.id !== action.payload);
        },
        updateOffersDataStatus: (
            state,
            action: PayloadAction<{ id: string; status: string }>
        ) => {
            return state.map((offer) =>
                offer.id === action.payload.id
                    ? { ...offer, status: action.payload.status }
                    : offer
            );
        },
    },
});

export const {
    upDateOffer,
    setOffersData,
    addOffer,
    removeOffer,
    updateOffersDataStatus,
} = offersDataSlice.actions;

const reducer = offersDataSlice.reducer;
export default reducer;
