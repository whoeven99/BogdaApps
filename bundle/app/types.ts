export interface OfferType {
    id: string;
    name: string;
    status: string;
    metafields: any;
    gmv: number;
    conversion: number;
    exposurePV: number;
    addToCartPV: number;
}

export interface ProductVariantsDataType {
    id: string;
    name: string;
    price: number;
    image: string
}