主要应用文件夹
-app
页面路由文件夹，主要存储页面前端文件和后端action接口文件
--routes
根路由入口文件夹，即打开域名时第一个进入的路由，正常不做修改
---\_index
shopify admin验证登录文件夹，正常不做修改
---auth.login
应用内部根路由文件
---app.\_index.tsx
应用内部母模板文件
---app.tsx
应用内部通用验证登录接口，正常不做修改
---auth.$.tsx
模板自动生成文件，后续会删除
---webhooks.app.scopes_update.tsx
模板自动生成文件，后续会删除
---webhooks.app.uninstalled.tsx

prisma数据后台相关文件，模板自动生成，目前所有项目均不使用
--db.server.ts
客户端入口文件
--entry.client.tsx
服务端端入口文件
--entry.server.tsx
模板自动生成文件，目前不知道什么作用
--globals.d.ts
i18n配置文件
--i18n.js
项目根路由文件
--root.tsx
模板自动生成文件，目前不知道什么作用
--routes.ts
shopify服务配置文件，这里决定应用内部admin.graphql等方法的真实权限和一些其他的配置
--shopify.server.ts

扩展相关代码文件夹
-extensions
运费折扣方法相关代码文件夹
--ciwi-bundle-free-shipping-discount-function
产品折扣方法和订单折扣方法相关代码文件夹
--ciwi-bundle-multiple-products-discount-function
主题模块扩展相关代码文件夹（暂时还没有开发只是模板文件）
--ciwi-bundle-section

静态资源文件夹
-public

开发环境docker部署文件
-DockerfileDev
生产环境docker部署文件
-DockerfileProd

生产环境shopify配置文件
shopify.app.prod.toml
测试环境shopify配置文件
shopify.app.test.toml
开发环境shopify配置文件
shopify.app.wgw.toml
