import { Node } from '@tiptap/core'

const IframeNode = Node.create({
  name: 'iframe',

  group: 'block', // 块级节点
  atom: true,     // 作为原子节点，不可拆开

  addAttributes() {
    return {
      srcdoc: {
        default: '', // 存储 HTML 内容
      },
      width: {
        default: '100%',
      },
      height: {
        default: '300px',
      },
    }
  },

  parseHTML() {
    return [{ tag: 'iframe' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['iframe', { ...HTMLAttributes }]
  },
})
export { IframeNode }