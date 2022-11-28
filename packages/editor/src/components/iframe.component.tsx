import { Injector } from '@tanbo/di'
import {
  ComponentInitData,
  ComponentInstance,
  ContentType,
  defineComponent,
  VElement,
  // useState,
} from '@textbus/core'
import { ComponentLoader } from '@textbus/browser'

export interface IframeState {
  src: string
}

export const iframeComponent = defineComponent({
  name: 'IframeComponent',
  type: ContentType.BlockComponent,
  setup(data?: ComponentInitData<IframeState>) {
    const state = data?.state || {
      src: '',
    }

    // const controller = useState(state)

    // controller.onChange.subscribe(s => {
    //   state = s
    // })

    return {
      render(): VElement {
        return (
          // @ts-ignore
          <iframe src={state!.src} style={{width: '100%', height: '300px', border: '1px solid #e8e8e8'}}></iframe>
        )
      },
      toJSON() {
        return {
          ...state!
        }
      }
    }
  }
})

export const iframeComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.tagName === 'IFRAME'
  },
  read(element: HTMLVideoElement, context: Injector): ComponentInstance {
    return iframeComponent.createInstance(context, {
      state: {
        src: element.src,
      }
    })
  },
}
