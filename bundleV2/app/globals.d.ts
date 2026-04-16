declare module "*.css";

declare module "@alicloud/log" {
  export type ClientOptions = Record<string, unknown>;
  export default class Client {
    constructor(options: ClientOptions);
    getLogs(...args: any[]): Promise<any>;
    getLogStore(...args: any[]): Promise<any>;
    postLogStoreLogs(...args: any[]): Promise<any>;
  }
}

declare namespace JSX {
  interface IntrinsicElements {
    "s-app-nav": any;
    "s-link": any;
  }
}
