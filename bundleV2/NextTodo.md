1. 处理所有的Components逻辑走通，目前有些组件还没办法走通和配置，也没有对应的 UI 样式
2. 对应的 bar 要检查下逻辑，包括是否要优化，比如 free gift 应该还没有 reward 的 product 选择器，因为 free gift 应该是要和当前商品不一样的
3. quantity breaks for different products的 bar 应该不一样，预览的时候应该也要有一个允许额外添加商品和变体的选择
4. 所有的 bar 目前处理的机制还是数量，还没有到金额等维度
5. 商品筛选还不够智能，比如没有快捷的全选、反选，包括根据特定条件查找并勾选商品等
6. step3 等模块的 UI 还需要继续微调
7. theme extension 需要支持变成区块可以直接让客户在主题里面添加
8. theme extension 的激活逻辑应该不强制校验在线主题，应该允许草稿主题也可以配置和生效 offer
9. theme extension 的配置页面需要支持在草稿主题下进行配置
10. theme extension和配置流程的预览，最好可以跟着当前客户的主题css文件走，减少需要自定义的部分
11. 到期日默认长期有效，而不需要一定选择一个结束时间
12. Targeting里面要增加客户人群的选择 segment 或者允许根据 IP、用户画像 进行筛选
13. 所有的报错 tips 或者一些警示性文案，要统一 tips 的样式风格和 shopify 规范一致