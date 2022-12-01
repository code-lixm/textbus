import { Injector } from '@tanbo/di'
import {
  Commander,
  ContentType,
  QueryStateType,
  Selection,
  Slot
} from '@textbus/core'

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'
import {
  initState,
  todolistComponent,
  TodoListSlotState
} from '../../components/todolist.component'
import { paragraphComponent } from '../../components/paragraph.component'

export function todolistToolConfigFactory(
  injector: Injector
): ButtonToolConfig {
  const i18n = injector.get(I18n)
  const commander = injector.get(Commander)
  const selection = injector.get(Selection)
  const instance = {
    iconClasses: ['textbus-icon-todo'],
    tooltip: i18n.get('plugins.toolbar.todolistTool.tooltip'),
    queryState() {
      const component = selection.commonAncestorComponent
      if (component?.name === todolistComponent.name) {
        return {
          state: QueryStateType.Enabled,
          value: component
        }
      }

      return {
        state: QueryStateType.Normal,
        value: null
      }
    },
    onClick() {
      const queryState = instance.queryState()
      if (queryState.state === QueryStateType.Normal) {
        instance.toList()
      } else {
        instance.toParagraph()
      }
    },
    toList() {
      commander.transform({
        target: todolistComponent,
        multipleSlot: true,
        slotFactory(): Slot {
          return new Slot<TodoListSlotState>(
            [ContentType.Text, ContentType.InlineComponent],
            initState()
          )
        }
      })
    },
    toParagraph() {
      commander.transform({
        target: paragraphComponent,
        multipleSlot: false,
        slotFactory(): Slot {
          return new Slot([ContentType.Text, ContentType.InlineComponent])
        }
      })
    }
  }
  return instance
}

export function todolistTool() {
  return new ButtonTool(todolistToolConfigFactory)
}
