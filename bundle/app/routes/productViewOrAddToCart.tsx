import Client from '@alicloud/log'
import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'

const sls = new Client({
    // 本示例从环境变量中获取AccessKey ID和AccessKey Secret。
    accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
    //日志服务的域名。此处以杭州为例，其它地域请根据实际情况填写。 
    endpoint: process.env.ALIBABA_CLOUD_ENDPOINT,
    region: process.env.ALIBABA_CLOUD_REGION || "us-west-1",
})
// 必选，Project名称。
const projectName = process.env.ALIBABA_CLOUD_PROJECT || "bogdalogtest"
// 必选，Logstore名称。
const logstoreName = process.env.ALIBABA_CLOUD_LOGSTORE || "bogdabundletest"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 200,
            headers: corsHeaders
        });
    }

    return new Response(null, {
        status: 200,
        headers: corsHeaders
    });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    // const formData = await request.formData();
    const data = await request.json()

    console.log("data: ", data);
    // 写入日志
    try {
        const logGroup = {
            logs: [
                {
                    content: {
                        event: data?.event || "product_view",
                        shopName: data?.shopName || "",
                        productId: data?.productId || "",
                        clientId: data?.clientId || "",
                        extra: JSON.stringify(data?.extra || {})
                    },
                    timestamp: Math.floor(new Date().getTime() / 1000)
                },
            ],
            topic: data?.event || "product_view",
            source: data?.shopName || ""
        };
        await sls.postLogStoreLogs(projectName, logstoreName, logGroup);

        return new Response(
            JSON.stringify({
                success: true,
                message: `${data?.shopName} ${data?.event} success`,
            }),
            {
                status: 200,
                headers: corsHeaders
            }
        );
    } catch (error: any) {
        console.error(`${data?.shopName} ${data?.event} error: `, error)
        return new Response(
            JSON.stringify({
                success: false,
                message: String(error),
            }),
            {
                status: error?.status || 500,
                headers: corsHeaders
            }
        );
    }
}