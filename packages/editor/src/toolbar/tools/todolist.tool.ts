import { Injector } from '@tanbo/di'
import { Commander, ContentType, QueryState, QueryStateType, Selection, Slot } from '@textbus/core'

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'
import { todolistComponent, TodoListSlotState } from '../../components/todolist.component'

export function todolistToolConfigFactory(injector: Injector): ButtonToolConfig {
  const i18n = injector.get(I18n)
  const commander = injector.get(Commander)
  const selection = injector.get(Selection)
  return {
    iconClasses: ['textbus-icon-todo'],
    tooltip: i18n.get('plugins.toolbar.todolistTool.tooltip'),
    queryState(): QueryState<boolean> {
      // if (selection.commonAncestorComponent?.parent) {
      //   return {
      //     state: QueryStateType.Normal,
      //     value: null
      //   }
      // }
      // return {
      //   state: QueryStateType.Disabled,
      //   value: null
      // }
      return {
        state: QueryStateType.Normal,
        value: null
      }
    },
    onClick() {
      const todo = todolistComponent.createInstance(injector, {
        slots: [
          new Slot<TodoListSlotState>([ContentType.Text, ContentType.InlineComponent])
        ]
      })
      commander.insertAfter(todo, selection.commonAncestorComponent!)
      selection.setPosition(todo.slots.get(0)!, 0)
    },
  }
}

export function todolistTool() {
  return new ButtonTool(todolistToolConfigFactory)
}
