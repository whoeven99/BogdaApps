import { ActionFunctionArgs } from "@remix-run/node";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const log = formData.get("log") as string;
  console.log(`应用日志: ${log}`);
  return null;
};
