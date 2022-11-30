import {
  ComponentInitData, ComponentInstance,
  ContentType,
  defineComponent, onContextMenu,
  onDestroy,
  Slot, useContext,
  useSlots,
  useState,
  VElement
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/browser'
import { Injector } from '@tanbo/di'
import { I18n } from '../i18n'

export interface AlertComponentState {
  type: string
  fill: boolean
}

export const alertComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'AlertComponent',
  setup(initData?: ComponentInitData<AlertComponentState>) {
    const slots = useSlots(initData?.slots || [])
    let state = initData?.state || {
      type: 'primary',
      fill: false
    }
    const stateController = useState(state)
    const injector = useContext()
    const i18n = injector.get(I18n)

    const sub = stateController.onChange.subscribe(newState => {
      state = newState
    })
    onDestroy(() => {
      sub.unsubscribe()
    })
    if (slots.length === 0) {
      slots.push(new Slot([
        ContentType.InlineComponent,
        ContentType.Text
      ]))
    }

    const childI18n = i18n.getContext('components.alertComponent.contextMenu')
    const tips = [
      { name: '默认', type: 'default' },
      { name: '普通', type: 'primary' },
      { name: '提示', type: 'info' },
      { name: '成功', type: 'success' },
      { name: '警告', type: 'warning' },
      { name: '危险', type: 'danger' },
    ]

    onContextMenu(ev => {
      ev.useMenus([{
        label: state.fill ? childI18n.get('noFill') : childI18n.get('fill'),
        onClick() {
          stateController.update(draft => {
            draft.fill = !state.fill
          })
        }
      }, {
        label: childI18n.get('type'),
        submenu: tips.map(item => {
          return {
            label: item.name,
            onClick() {
              stateController.update(draft => {
                draft.type = item.type
              })
            }
          }
        })
      }])
    })

    return {
      render(_, slotRender): VElement {
        const classes = ['tb-alert']
        if (state.fill) {
          classes.push('tb-alert-fill')
        }
        if (state.type) {
          classes.push('tb-alert-' + state.type)
        }
        return (
          <div component-name='AlertComponent' data-type={state.type} class={classes.join(' ')}>
            {
              slotRender(slots.get(0)!, () => {
                return <div />
              })
            }
          </div>
        )
      }
    }
  }
})

export const alertComponentLoader: ComponentLoader = {
  resources: {
    styles: [`
.tb-alert {
  display: block;
  padding: 10px 15px;
  border-radius: 6px;
  border: 1px solid #e9eaec;
  background-color: #f8f8f9;
  margin-top: 1em;
  margin-bottom: 1em
}

.tb-alert.tb-alert-primary {
  border-color: rgba(95,130,255,.12);
  background-color: rgba(95, 130, 255, 0.15)
}

.tb-alert.tb-alert-primary.tb-alert-fill {
  color: #fff;
  background-color: #5f82ff
}

.tb-alert.tb-alert-success {
  border-color: rgba(21, 189, 154, 0.3);
  background-color: rgba(21, 189, 154, 0.15)
}

.tb-alert.tb-alert-success.tb-alert-fill {
  color: #fff;
  background-color: #15bd9a
}

.tb-alert.tb-alert-info {
  border-color: rgba(106, 209, 236, 0.3);
  background-color: rgba(106, 209, 236, 0.15)
}

.tb-alert.tb-alert-info.tb-alert-fill {
  color: #fff;
  background-color: #6ad1ec
}

.tb-alert.tb-alert-warning {
  border-color: rgba(255, 153, 0, 0.3);
  background-color: rgba(255, 153, 0, 0.15)
}

.tb-alert.tb-alert-warning.tb-alert-fill {
  color: #fff;
  background-color: #f90
}

.tb-alert.tb-alert-danger {
  border-color: rgba(231, 79, 94, 0.3);
  background-color: rgba(231, 79, 94, 0.15)
}

.tb-alert.tb-alert-danger.tb-alert-fill {
  color: #fff;
  background-color: #E74F5E
}

.tb-alert.tb-alert-dark {
  border-color: rgba(73, 80, 96, 0.3);
  background-color: rgba(73, 80, 96, 0.15)
}

.tb-alert.tb-alert-dark.tb-alert-fill {
  color: #fff;
  background-color: #495060
}

.tb-alert.tb-alert-gray {
  border-color: rgba(187, 190, 196, 0.3);
  background-color: rgba(187, 190, 196, 0.15)
}

.tb-alert.tb-alert-gray.tb-alert-fill {
  color: #fff;
  background-color: #bbbec4
}

.tb-alert-fill code {
  background-color: rgba(255, 255, 255, 0.2);
  border: none
}`
    ]
  },
  match(element: HTMLElement): boolean {
    return element.tagName === 'DIV' && element.getAttribute('component-name') === 'AlertComponent'
  },
  read(element: HTMLElement, context: Injector, slotParser: SlotParser): ComponentInstance {
    return alertComponent.createInstance(context, {
      state: {
        fill: element.classList.contains('tb-alert-fill'),
        type: element.dataset.type || ''
      },
      slots: [
        slotParser(new Slot([
          ContentType.InlineComponent,
          ContentType.Text
        ]), element.children[0] as HTMLElement || document.createElement('div'))
      ]
    })
  }
}
