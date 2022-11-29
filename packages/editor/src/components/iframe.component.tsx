import { Injector } from '@tanbo/di'
import {
  ComponentInitData,
  ComponentInstance,
  ContentType,
  defineComponent,
  VElement,
  useRef,
  useState,
} from '@textbus/core'
import { ComponentLoader } from '@textbus/browser'

import { useDragResize } from './hooks/drag-resize'

export interface IframeComponentLiteral {
  src: string
  maxWidth?: string;
  maxHeight?: string;
  width?: string
  height?: string
  margin?: string
  float?: string
}


export const iframeComponent = defineComponent({
  type: ContentType.InlineComponent,
  name: 'IframeComponent',
  setup(data?: ComponentInitData<IframeComponentLiteral>) {
    let state = data?.state || {
      src: ''
    }
    const stateController = useState(state)

    stateController.onChange.subscribe(v => {
      state = v
    })

    const ref = useRef<HTMLIFrameElement>()

    useDragResize(ref, rect => {
      stateController.update(draft => {
        Object.assign(draft, rect)
      })
    })

    return {
      render(): VElement {
        return (
          <iframe component-name='iframe' class="tb-iframe" src={state.src} ref={ref} style={{
            width: state.width,
            height: state.height,
            maxWidth: state.maxWidth,
            maxHeight: state.maxHeight,
            margin: state.margin,
            float: state.float
          }}/>
        )
      }
    }
  }
})

export const iframeComponentLoader: ComponentLoader = {
  resources: {
    styles: [
  `
.tb-iframe: {
  max-width:100%;
  width:100%;
  max-height:500px;
  border:1px solid #e8e8e8;
}
  `
    ]
  },
  match(element: HTMLElement): boolean {
    return element.tagName === 'IFRAME'
  },
  read(element: HTMLElement, injector: Injector): ComponentInstance {
    const style = element.style
    return iframeComponent.createInstance(injector, {
      state: {
        src: element.getAttribute('src') || '',
        width: style.width || '100%',
        height: style.height || '500px',
        margin: style.margin,
        float: style.float,
        maxWidth: '100%',
        maxHeight: '800px'
      }
    })
  },
}
