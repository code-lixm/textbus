import { Injector } from '@tanbo/di'
import {
  ComponentInstance,
  ComponentExtends,
  ContentType,
  defineComponent,
  onBreak,
  Slot,
  SlotRender,
  Selection,
  useContext,
  useSlots,
  VElement,
  ComponentInitData,
  useState,
  onDestroy,
  useDynamicShortcut,
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/browser'
import { paragraphComponent } from './paragraph.component'

const olTypeJudge: Array<'i' | 'a' | '1'> = ['i', '1', 'a']

export interface SegmentedSlots<T extends Slot = Slot> {
  before: T[];
  middle: T[];
  after: T[];
}

export interface ListSlotState {
  haveChild: boolean;
}

export interface ListComponentData {
  type: 'ul' | 'ol';
  level: number;
}

export interface ListComponentExtends extends ComponentExtends {
  type: 'ul' | 'ol';

  split?(startIndex: number, endIndex: number): SegmentedSlots;
}

export const listComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'ListComponent',
  separable: true,
  zenCoding: {
    key: ' ',
    match: /^(1\.|[-+*])$/,
    generateInitData(content: string) {
      return {
        state: {
          type: /[-+*]/.test(content) ? 'ul' : 'ol',
          level: 1,
        },
      }
    },
  },
  setup(
    data?: ComponentInitData<ListComponentData, ListSlotState>
  ): ListComponentExtends {
    const injector = useContext()
    const selection = injector.get(Selection)

    let state = data?.state || { type: 'ul', level: 1 }

    const stateController = useState(state)
    const sub = stateController.onChange.subscribe((v) => {
      state = v
    })

    onDestroy(() => {
      sub.unsubscribe()
    })

    const slots = useSlots<ListSlotState>(
      data?.slots || [
        new Slot<ListSlotState>(
          [
            ContentType.Text,
            ContentType.InlineComponent,
            ContentType.BlockComponent,
          ],
          {
            haveChild: false,
          }
        ),
      ]
    )
    // 降级
    useDynamicShortcut({
      keymap: {
        key: 'Tab',
        shiftKey: true,
      },
      action() {
        // 获取当前插槽
        const slot = selection.commonAncestorSlot as Slot<ListSlotState>
        const slotIndex = slot.index
        const parentSlot = slot?.parentSlot
        // 当前插槽的父组件的父插槽有子元素
        if (parentSlot?.state?.haveChild) {
          //获取当前插槽在插槽集中的索引
          // const slots = slot?.parent?.slots!
          const index = slots?.indexOf(slot) || 0
          const afterSlot = slots.get(index + 1)

          const deleteSlots: Array<Slot<ListSlotState>> = []
          const popSlot = () => {
            const deleteSlot = slots.pop()
            deleteSlot && deleteSlots.unshift(deleteSlot)
            if (deleteSlot !== slot) popSlot()
          }
          popSlot()
          // 去掉当前插槽
          deleteSlots.shift()
          // 当前插槽有子元素
          if (afterSlot?.state?.haveChild) {
            deleteSlots.shift()
            afterSlot.sliceContent().forEach((item: any) => {
              if (item.name === 'ListComponent') {
                item.slots.push(...deleteSlots)
              }
            })
            parentSlot.parent?.slots.insertAfter([slot, afterSlot], parentSlot)
          } else {
            const insertSlots = [slot]
            if (deleteSlots.length) {
              // 创建新插槽
              const newSlot = new Slot<ListSlotState>(
                [
                  ContentType.Text,
                  ContentType.InlineComponent,
                  ContentType.BlockComponent,
                ],
                { haveChild: true }
              )
              // 创建新的 listComponent
              const component = listComponent.createInstance(injector, {
                state: { type: state.type, level: state.level },
                slots: deleteSlots,
              })
              // 将新组件插入当前插槽
              newSlot.insert(component)
              insertSlots.push(newSlot)
            }
            parentSlot.parent?.slots.insertAfter(insertSlots, parentSlot)
          }
          if (!slots.length) {
            parentSlot.parent?.slots.remove(parentSlot)
          }
          selection.setPosition(slot, slotIndex)
        }
      },
    })
    // 升级
    useDynamicShortcut({
      keymap: {
        key: 'Tab',
      },
      action() {
        // 获取当前插槽和下标位置
        const slot = selection.commonAncestorSlot!
        const slotIndex = slots.indexOf(slot)
        const index = slot.index || 0
        const beforeSlot = slots.get(slotIndex - 1)
        const afterSlot = slots.get(slotIndex + 1)
        // 不允许缩进第一个子元素
        if (slotIndex === 0) return

        // 如果当前插槽的前一个插槽有子元素，则将此插槽进行合并
        if (beforeSlot?.state?.haveChild) {
          beforeSlot.sliceContent().forEach((item: any) => {
            if (item.name === 'ListComponent') {
              item.slots.push(slot)
              afterSlot?.state?.haveChild && item.slots.push(afterSlot)
            }
          })
        } else {
          // 创建新插槽
          const newSlot = new Slot<ListSlotState>(
            [
              ContentType.Text,
              ContentType.InlineComponent,
              ContentType.BlockComponent,
            ],
            { haveChild: false }
          )
          // 把全部内容剪切到新插槽
          slot?.cutTo(newSlot)

          const newSlots = [newSlot]
          if (afterSlot?.state?.haveChild) {
            newSlots.push(afterSlot)
          }

          // 创建新的 listComponent
          const component = listComponent.createInstance(injector, {
            state: { type: state.type, level: state.level + 1 },
            slots: newSlots,
          })
          // 将新组件插入当前插槽
          slot?.insert(component)
          // 更新当前插槽状态
          slot?.updateState((draft: ListSlotState) => {
            if (draft) {
              draft.haveChild = true
            }
          })
          selection.setPosition(newSlot, index)
        }
      },
    })

    // 回车创建新行
    onBreak((ev) => {
      const slot = ev.target
      const slotIndex = slots.indexOf(slot)
      const afterSlot = slots.get(slotIndex + 1)

      // 当前插槽为空或者为最后一个插槽，向父节点创建
      if (slot.isEmpty && slot === slots.last) {
        // 获取当前插槽的父组件的父插槽
        const parentSlot = slot.parentSlot
        // 当前插槽的父组件的父插槽有子元素
        if (parentSlot?.state?.haveChild) {
          const newSlot = new Slot<ListSlotState>(
            [
              ContentType.Text,
              ContentType.InlineComponent,
              ContentType.BlockComponent,
            ],
            { haveChild: false }
          )
          // 删除当前插槽
          slots.remove(slot)
          parentSlot.parent?.slots.insertAfter(newSlot, parentSlot)
          selection.setPosition(newSlot, 0)
        } else {
          // 转换成文本
          const paragraph = paragraphComponent.createInstance(injector)
          const parentComponent = selection.commonAncestorComponent!
          const parentSlot = parentComponent.parent!
          const index = parentSlot.indexOf(parentComponent)
          parentSlot.retain(index + 1)
          if (slots.length > 1) {
            slots.remove(slots.last)
          }
          parentSlot.insert(paragraph)
          selection.setPosition(paragraph.slots.get(0)!, 0)
        }
        ev.preventDefault()
        return
      }

      // 正常向后插入
      const nextLi = ev.target.cut(ev.data.index)
      if (afterSlot?.state?.haveChild) {
        afterSlot.sliceContent().forEach((item: any) => {
          if (item.name === 'ListComponent') {
            item.slots.unshift(nextLi)
          }
        })
      } else {
        slots.insertAfter(nextLi, ev.target)
      }
      selection.setPosition(nextLi, 0)
      ev.preventDefault()
    })

    return {
      type: state.type,
      render(isOutputMode: boolean, slotRender: SlotRender): VElement {
        const Tag = state.type
        return (
          <Tag
            level={state.level}
            type={olTypeJudge[state.level % 3]}
            class={state.level <= 1 ? 'tb-list-item' : ''}
          >
            {slots.toArray().map((slot) => {
              const state = slot.state
              const CustomTag = state?.haveChild ? 'div' : 'li'
              return slotRender(slot, () => {
                return <CustomTag />
              })
            })}
          </Tag>
        )
      },
      split(startIndex: number, endIndex: number) {
        return {
          before: slots.slice(0, startIndex),
          middle: slots.slice(startIndex, endIndex),
          after: slots.slice(endIndex),
        }
      },
    }
  },
})

export const listComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return (
      element.getAttribute('component-name') === 'List'
      // ||
      // element.tagName === "OL" ||
      // element.tagName === "UL"
    )
  },
  resources: {
    styles: [
      `.tb-list-item {margin-top: 0.5em; margin-bottom: 0.5em}
      .have-child {list-style: none}
      `,
    ],
  },
  read(
    element: HTMLElement,
    injector: Injector,
    slotParser: SlotParser
  ): ComponentInstance {
    const slots: Slot[] = []
    const level = element.getAttribute('level') || 1
    console.log({ element, childNodes: Array.from(element.childNodes) })

    function ergodicNode(element: HTMLElement, slots: Slot[], level: number) {
      // 获取列表项
      const childNodes = Array.from(element.childNodes)
      // 遍历列表项
      childNodes.forEach((node) => {
        // 处理li
        if (/^li$/i.test(node.nodeName)) {
          const slot = new Slot<ListSlotState>(
            [
              ContentType.Text,
              ContentType.InlineComponent,
              ContentType.BlockComponent,
            ],
            {
              haveChild: false,
            }
          )
          slotParser(slot, node as HTMLElement)
          slots.push(slot)
        } else {
          // 处理ol/ul
          const slot = new Slot<ListSlotState>(
            [
              ContentType.Text,
              ContentType.InlineComponent,
              ContentType.BlockComponent,
            ],
            {
              haveChild: true,
            }
          )
          const newSlots: Slot[] = []
          level++
          ergodicNode(node as HTMLElement, newSlots, level)
          const component = listComponent.createInstance(injector, {
            state: { type: element.tagName.toLowerCase() as any, level },
            slots: newSlots,
          })
          slot.insert(component)
          slots.push(slot)
        }
      })
    }

    ergodicNode(element, slots, 1)

    return listComponent.createInstance(injector, {
      slots,
      state: {
        type: element.tagName.toLowerCase() as any,
        level: Number(level),
      },
    })
  },
}
