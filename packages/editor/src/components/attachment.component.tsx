import {
  ComponentInitData,
  ComponentInstance,
  ContentType,
  defineComponent,
  onDestroy,
  useContext,
  useState,
  VElement,
  Controller,
  onViewInit,
  useSelf,
  Commander,
} from '@textbus/core'
import { ComponentLoader } from '@textbus/browser'
import { Injector } from '@tanbo/di'
import { Dialog } from '../dialog'
import { Form, FormTextField } from '../uikit/forms/_api'
import { I18n } from '../i18n'
import { getFileTypeByName } from './_api'
export interface AttachmentComponentState {
  url: string
  name: string
}

// eslint-disable-next-line max-len
// const svg =
//   '<svg></svg>'
// const defaultAttachmentSrc =
//   'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
export const attachmentComponent = defineComponent({
  type: ContentType.InlineComponent,
  separable: false,
  name: 'AttachmentComponent',
  setup(initData?: ComponentInitData<AttachmentComponentState>) {
    let state = initData?.state || {
      url: '',
      name: `${new Date().toLocaleString()}`
    }

    const stateController = useState(state)
    const self = useSelf()

    const injector = useContext()
    const commander = injector.get(Commander)
    const dialog = injector.get(Dialog)
    const i18n = injector.get(I18n)
    const controller = injector.get(Controller)
    const readonly = controller.readonly


    const sub = stateController.onChange.subscribe((newState) => {
      state = newState
    })

    onViewInit(() => {
      if (!state.url) {
        commander.removeComponent(self)
        commander.insert(state.name)
      }
    })

    onDestroy(() => {
      sub.unsubscribe()
    })

    const childI18n = i18n.getContext('components.attachmentComponent.setting')

    function showForm() {
      const form = new Form({
        title: childI18n.get('title'),
        confirmBtnText: childI18n.get('confirmBtnText'),
        cancelBtnText: childI18n.get('cancelBtnText'),
        items: [
          new FormTextField({
            label: childI18n.get('name'),
            name: 'name',
            value: state.name,
            placeholder: childI18n.get('namePlaceholder')
          })
        ]
      })
      dialog.show(form.elementRef)

      form.onComplete.subscribe((values) => {
        stateController.update((draft) => {
          Object.assign(draft, values)
        })
        dialog.hide()
      })
      form.onCancel.subscribe(() => {
        dialog.hide()
      })
    }
    // 点击附件下载
    return {
      render(): VElement {
        return (
          <span component-name="AttachmentComponent" class="tb-attachment">
            {readonly ? (
              <a title={state.name} href={state.url} download={state.name}>
                <img src={getFileTypeByName(state.name)} style='max-wdith:20px;' />
                <span>{state.name}</span>
              </a>
            ) : (
              <span title={state.name} onClick={showForm}>
                <img src={getFileTypeByName(state.name)} style='max-wdith:20px;' />
                <span>{state.name}</span>
              </span>
            )}
          </span>
        )
      }
    }
  }
})

export const attachmentComponentLoader: ComponentLoader = {
  resources: {
    styles: [
      `
.tb-attachment {
  display: inline-block;
  white-space: nowrap;
  background: #f3f4f5;
  border-radius: 4px;
  padding: 0 10px;
  cursor: pointer;
}
.tb-attachment img {
  max-width: 15px;
  height: 15px;
  margin-right: 5px;
  position: relative;
  top: 1px;
}
.tb-attachment:hover {
  background: #f1f1f1;
}
`
    ]
  },
  match(element: HTMLElement): boolean {
    return (
      element.tagName === 'SPAN' &&
      (element.getAttribute('component-name') === 'AttachmentComponent' || element.getAttribute('data-w-e-type') === 'attachment')
    )
  },
  read(element: HTMLElement, context: Injector): ComponentInstance {
    console.log('%c [ element ]-150', 'font-size:13px; background:#cc2485; color:#ff68c9;', element.dataset)
    return attachmentComponent.createInstance(context, {
      state: {
        url: (element.dataset.url || element.dataset.link) || '',
        name: `${element.dataset.name || element.dataset.filename || new Date().toLocaleString()}`
      }
    })
  }
}
