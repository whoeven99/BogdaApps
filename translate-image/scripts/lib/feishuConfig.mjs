export function prefixFeishuText(message, env) {
  if (env === "prod") return message;
  const prefix = "[测试] ";
  if (message.startsWith(prefix)) return message;
  return `${prefix}${message}`;
}
