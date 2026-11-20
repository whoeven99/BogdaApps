import { Node, mergeAttributes } from '@tiptap/core'

export const Video = Node.create({
  name: 'video',
  group: 'block',
  selectable: true,
  atom: true, // 视频节点不可拆分

  addAttributes() {
    return {
      src: {
        default: null,
      },
      width: {
        default: '560',
      },
      height: {
        default: '315',
      },
      frameborder: {
        default: '0',
      },
      allowfullscreen: {
        default: 'true',
      },
    }
  },

  parseHTML() {
    return [
      { tag: 'iframe[src]' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'iframe',
      mergeAttributes(HTMLAttributes, {
        allowfullscreen: 'true',
      }),
    ]
  },

  addCommands():any {
    return {
      setVideo:
        (options:any) =>
        ({ commands }:any) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },
})
