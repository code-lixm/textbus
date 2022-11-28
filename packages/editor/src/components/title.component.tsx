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
  VElement,
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/browser'

import { useEnterBreaking } from './hooks/single-block-enter'

export const titleComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'TitleComponent',
  setup(data?: ComponentInitData<string>) {
    const injector = useContext()
    const slots = useSlots(data?.slots || [new Slot([ContentType.Text])])
    if (!slots.length) {
      slots.push(new Slot([ContentType.Text]))
    }
    useEnterBreaking(injector, slots)

    return {
      render(_: boolean, slotRender: SlotRender): VElement {
        return slotRender(slots.get(0)!, () => {
          // @ts-ignore
          return <h1 />
        })
      },
    }
  },
})

export const headingComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.tagName === 'H1'
  },
  read(
    element: HTMLElement,
    injector: Injector,
    slotParser: SlotParser
  ): ComponentInstance {
    const slot = slotParser(new Slot([ContentType.Text]), element)
    return titleComponent.createInstance(injector, {
      slots: [slot],
      state: element.tagName.toLowerCase(),
    })
  },
}
