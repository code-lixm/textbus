import { Injector } from '@tanbo/di'
import {
  ComponentInitData,
  ComponentInstance,
  ContentType,
  defineComponent,
  Slot,
  SlotRender,
  useContext,
  useSlots,
  VElement
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/browser'

import { useEnterBreaking } from './hooks/single-block-enter'

export const headingComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'HeadingComponent',
  zenCoding: {
    key: ' ',
    match(content: string) {
      return /^#{1,6}$/.test(content)
    },
    generateInitData(content) {
      return {
        state: 'h' + content.length
      }
    }
  },
  setup(data?: ComponentInitData<string>) {
    const injector = useContext()
    const slots = useSlots(data?.slots || [new Slot([
      ContentType.Text,
      ContentType.InlineComponent
    ])])
    if (!slots.length) {
      slots.push(new Slot([
        ContentType.Text,
        ContentType.InlineComponent
      ]))
    }
    useEnterBreaking(injector, slots)

    return {
      type: data?.state || 'h1',
      render(isOutputMode: boolean, slotRender: SlotRender): VElement {
        return slotRender(slots.get(0)!, children => {
          const Tag = data?.state || 'h1'
          return <Tag>{children}</Tag>
        })
      }
    }
  }
})

export const headingComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return /^h[1-6]$/i.test(element.tagName)
  },
  read(element: HTMLElement, injector: Injector, slotParser: SlotParser): ComponentInstance {
    const slot = slotParser(new Slot([
      ContentType.Text,
      ContentType.InlineComponent,
    ]), element)
    return headingComponent.createInstance(injector, {
      slots: [slot],
      state: element.tagName.toLowerCase()
    })
  },
}
