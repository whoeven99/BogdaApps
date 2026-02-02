import axios from "axios";

//查询totalGMV
export const GetTotalGMV = async ({
    shopName,
    server,
    day,
}: {
    shopName: string;
    server?: string;
    day?: number;
}) => {
    try {
        const response = await axios({
            url: `${server || process.env.SERVER_URL}/bundle/exposure/getTotalGMV?shopName=${shopName}&day=${day || 60}`,
            method: "POST",
        });

        console.log(`${shopName} GetTotalGMV: `, response.data);

        return response.data;
    } catch (error) {
        console.error(`${shopName} Error GetTotalGMV:`, error);
        return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: null,
        };
    }
};

//查询totalGMV
export const GetTotalGMVIndicator = async ({
    shopName,
    server,
    day,
}: {
    shopName: string;
    server?: string;
    day?: number;
}) => {
    try {
        const response = await axios({
            url: `${server || process.env.SERVER_URL}/bundle/exposure/getTotalGMVIndicator?shopName=${shopName}&day=${day || 60}`,
            method: "POST",
        });

        console.log(`${shopName} GetTotalGMVIndicator: `, response.data);

        return response.data;
    } catch (error) {
        console.error(`${shopName} Error GetTotalGMVIndicator:`, error);
        return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: null,
        };
    }
};

//查询avgConversion
export const GetAvgConversion = async ({
    shopName,
    server,
}: {
    shopName: string;
    server?: string;
}) => {
    try {
        const response = await axios({
            url: `${server || process.env.SERVER_URL}/bundle/exposure/getAvgConversion?shopName=${shopName}`,
            method: "POST",
        });

        console.log(`${shopName} GetAvgConversion: `, response.data);

        return response.data;
    } catch (error) {
        console.error(`${shopName} Error GetAvgConversion:`, error);
        return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: null,
        };
    }
};

//获取visitor数据
export const ProductUvByTimeAndShopName = async ({
    shopName,
    server,
    day,
    bundleId,
}: {
    shopName: string;
    server?: string;
    day: number;
    bundleId?: string;
}) => {
    try {
        const response = await axios({
            url: `${server || process.env.SERVER_URL}/bundle/exposure/productUvByTimeAndShopName?shopName=${shopName}`,
            method: "POST",
            data: {
                day,
                bundleId,
            },
        });

        console.log(`${shopName} ProductUvByTimeAndShopName: `, response.data);

        return response.data;
    } catch (error) {
        console.error(`${shopName} Error ProductUvByTimeAndShopName:`, error);
        return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: null,
        };
    }
};

//获取bundleOrders数据
export const BundleOrdersByTimeAndShopName = async ({
    shopName,
    server,
    day,
    bundleId,
}: {
    shopName: string;
    server?: string;
    day: number;
    bundleId?: string;
}) => {
    try {
        const response = await axios({
            url: `${server || process.env.SERVER_URL}/bundle/exposure/bundleOrdersByTimeAndShopName?shopName=${shopName}`,
            method: "POST",
            data: {
                day,
                bundleId,
            },
        });

        console.log(`${shopName} BundleOrdersByTimeAndShopName: `, response.data);

        return response.data;
    } catch (error) {
        console.error(`${shopName} Error BundleOrdersByTimeAndShopName:`, error);
        return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: null,
        };
    }
};

//获取conversion数据
export const GetConversionToBundle = async ({
    shopName,
    server,
    day,
    bundleId,
}: {
    shopName: string;
    server?: string;
    day: number;
    bundleId?: string;
}) => {
    try {
        const response = await axios({
            url: `${server || process.env.SERVER_URL}/bundle/exposure/getConversionToBundle?shopName=${shopName}`,
            method: "POST",
            data: {
                day,
                bundleId,
            },
        });

        console.log(`${shopName} GetConversionToBundle: `, response.data);

        return response.data;
    } catch (error) {
        console.error(`${shopName} Error GetConversionToBundle:`, error);
        return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: null,
        };
    }
};

//获取conversion金额数据
export const GetConversionToBundleAmount = async ({
    shopName,
    server,
    day,
    bundleId,
}: {
    shopName: string;
    server?: string;
    day: number;
    bundleId?: string;
}) => {
    try {
        const response = await axios({
            url: `${server || process.env.SERVER_URL}/bundle/exposure/getConversionToBundleAmount?shopName=${shopName}`,
            method: "POST",
            data: {
                day,
                bundleId,
            },
        });

        console.log(`${shopName} GetConversionToBundleAmount: `, response.data);

        return response.data;
    } catch (error) {
        console.error(`${shopName} Error GetConversionToBundleAmount:`, error);
        return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: null,
        };
    }
};

//获取Offers 报表数据
export const GetAllUserDiscount = async ({
    shopName,
    server,
}: {
    shopName: string;
    server?: string;
}) => {
    try {
        const response = await axios({
            url: `${server || process.env.SERVER_URL}/bundle/discount/getAllUserDiscount?shopName=${shopName}`,
            method: "POST",
        });

        console.log(`${shopName} GetAllUserDiscount: `, response.data);

        return response.data;
    } catch (error) {
        console.error(`${shopName} Error GetAllUserDiscount:`, error);
        return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: null,
        };
    }
};

//查询用户折扣信息
export const BatchQueryUserDiscount = async ({
    shopName,
    server,
}: {
    shopName: string;
    server?: string;
}) => {
    try {
        const response = await axios({
            url: `${server || process.env.SERVER_URL}/bundle/discount/batchQueryUserDiscount?shopName=${shopName}`,
            method: "POST",
        });

        console.log(`${shopName} BatchQueryUserDiscount: `, response.data);

        return response.data;
    } catch (error) {
        console.error(`${shopName} Error BatchQueryUserDiscount:`, error);
        return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: null,
        };
    }
};

// 保存用户折扣信息到后端
export const SaveUserDiscount = async ({
    shopName,
    server,
    data
}: {
    shopName: string;
    server?: string;
    data: any;
}) => {
    try {
        console.log(`${shopName} SaveUserDiscount Input: `, JSON.stringify(data));

        const response = await axios({
            url: `${server || process.env.SERVER_URL}/bundle/discount/saveUserDiscount?shopName=${shopName}`,
            method: "POST",
            data
        });

        console.log(`${shopName} SaveUserDiscount: `, response.data);

        return response.data;
    } catch (error) {
        console.error(`${shopName} Error SaveUserDiscount:`, error);
        return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: null,
        };
    }
};

// 更新用户折扣信息到后端
export const UpdateUserDiscount = async ({
    shopName,
    server,
    data
}: {
    shopName: string;
    server?: string;
    data: any;
}) => {
    try {
        console.log(`${shopName} UpdateUserDiscount Input: `, JSON.stringify(data));

        const response = await axios({
            url: `${server || process.env.SERVER_URL}/bundle/discount/updateUserDiscount?shopName=${shopName}`,
            method: "POST",
            data
        });

        console.log(`${shopName} UpdateUserDiscount: `, response.data);

        return response.data;
    } catch (error) {
        console.error(`${shopName} Error UpdateUserDiscount:`, error);
        return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: null,
        };
    }
};

// 删除后端用户折扣信息
export const DeleteUserDiscount = async ({
    shopName,
    server,
    discountGid
}: {
    shopName: string;
    server?: string;
    discountGid: string;
}) => {
    try {
        const response = await axios({
            url: `${server || process.env.SERVER_URL}/bundle/discount/deleteUserDiscount?shopName=${shopName}&discountGid=${discountGid}`,
            method: "POST",
        });

        console.log(`${shopName} DeleteUserDiscount: `, response.data);

        return response.data;
    } catch (error) {
        console.error(`${shopName} Error DeleteUserDiscount:`, error);
        return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: null,
        };
    }
};

// 修改用户折扣状态信息
export const UpdateUserDiscountStatus = async ({
    shopName,
    server,
    discountGid,
    status
}: {
    shopName: string;
    server?: string;
    discountGid: string;
    status: string;
}) => {
    try {
        const response = await axios({
            url: `${server || process.env.SERVER_URL}/bundle/discount/updateUserDiscountStatus?shopName=${shopName}&discountGid=${discountGid}&status=${status}`,
            method: "POST",
        });

        console.log(`${shopName} UpdateUserDiscountStatus: `, response.data);

        return response.data;
    } catch (error) {
        console.error(`${shopName} Error UpdateUserDiscountStatus:`, error);
        return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: null,
        };
    }
};

// 获取用户特定折扣信息
export const GetUserDiscount = async ({
    shopName,
    server,
    discountGid,
}: {
    shopName: string;
    server?: string;
    discountGid: string;
}) => {
    try {
        const response = await axios({
            url: `${server || process.env.SERVER_URL}/bundle/discount/getUserDiscount?shopName=${shopName}&discountGid=${discountGid}`,
            method: "POST",
        });

        console.log(`${shopName} GetUserDiscount: `, response.data);

        return response.data;
    } catch (error) {
        console.error(`${shopName} Error GetUserDiscount:`, error);
        return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: null,
        };
    }
};

// 初始化用户数据
export const InitUser = async ({
    shopName,
    server,
    accessToken,
    email,
    userTag,
    firstName,
    lastName,
}: {
    shopName: string;
    server?: string;
    accessToken: string;
    email: string;
    userTag: string;
    firstName: string;
    lastName: string;
}) => {
    try {
        const response = await axios({
            url: `${server || process.env.SERVER_URL}/bundle/users/initUser?shopName=${shopName}`,
            method: "POST",
            data: {
                accessToken,
                email,
                userTag,
                firstName,
                lastName,
            }
        });

        console.log(`${shopName} InitUser: `, response.data);

        return response.data;
    } catch (error) {
        console.error(`${shopName} Error InitUser:`, error);
        return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: null,
        };
    }
};
