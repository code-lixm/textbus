import { Injector } from '@tanbo/di'
import { EDITOR_OPTIONS } from '@textbus/browser'
import {
  Commander,
  ContentType,
  Keyboard,
  Selection,
  Plugin,
} from '@textbus/core'
import { mentionComponent } from '../components/_api'
import { EditorOptions } from '../types'

export class MentionPlugin implements Plugin {
  setup(injector: Injector) {
    const keyboard = injector.get(Keyboard)
    const selection = injector.get(Selection)
    const commander = injector.get(Commander)
    const options = injector.get(EDITOR_OPTIONS) as EditorOptions
    const shareUsers = options.moduleAPI?.getShareUsers().slice() || []
    const isValid = !!shareUsers.length

    keyboard.addShortcut({
      keymap: {
        key: '@',
        shiftKey: true,
      },
      action() {
        const { commonAncestorSlot, commonAncestorComponent } = selection
        const content = commonAncestorSlot?.toString() || ' '
        const firstString =
          commonAncestorSlot?.getContentAtIndex(selection.startOffset! - 1) ||
          ' '

        // 初始条件
        if (
          commonAncestorSlot!.schema.includes(ContentType.InlineComponent) &&
          commonAncestorComponent?.name !== 'HeadingComponent'
        ) {
          // 首行直接@ 与 非首行空格后 @，否则当做普通文本
          if (
            content === '\n' ||
            content.substr(-1) === ' ' ||
            (firstString === ' ' && isValid)
          ) {
            const initialMentionState = {
              isSelected: false,
              username: '',
              authId: '',
            }
            const component = mentionComponent.createInstance(injector, {
              state: initialMentionState,
            })
            commander.insert(component)
            selection.setPosition(component.slots.get(0)!, 0)
          } else {
            commander.insert('@')
          }
        }else {
          commander.insert('@')
        }
      },
    })
  }
}
