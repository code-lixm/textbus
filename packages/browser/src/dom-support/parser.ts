import { Inject, Injectable, Injector } from '@tanbo/di'
import {
  Attribute,
  ComponentInstance,
  FormatItem,
  Formatter,
  FormatValue,
  Slot
} from '@textbus/core'

import { ViewOptions } from '../core/types'
import { EDITOR_OPTIONS } from '../core/injection-tokens'

export interface ComponentResources {
  links?: Array<{ [key: string]: string }>
  styles?: string[]
  scripts?: string[]
  editModeStyles?: string[]
}

export interface SlotParser {
  <T extends Slot>(childSlot: T, childElement: HTMLElement): T
}

/**
 * 组件加载器
 */
export interface ComponentLoader {
  /** 组件所需要的外部资源 */
  resources?: ComponentResources

  /** 识别组件的匹配方法 */
  match(element: HTMLElement): boolean

  /** 读取组件内容的方法 */
  read(element: HTMLElement, context: Injector, slotParser: SlotParser): ComponentInstance | Slot
}

export interface FormatLoaderReadResult<T extends FormatValue> {
  formatter: Formatter<T>
  value: T
}

export interface FormatLoader<T extends FormatValue> {
  match(element: HTMLElement): boolean

  read(element: HTMLElement): FormatLoaderReadResult<T>
}

export interface AttributeLoaderReadResult<T extends FormatValue> {
  attribute: Attribute<T>
  value: T
}

export interface AttributeLoader<T extends FormatValue> {
  match(element: HTMLElement): boolean

  read(element: HTMLElement): AttributeLoaderReadResult<T>
}

@Injectable()
export class Parser {
  static parseHTML(html: string) {
    return new DOMParser().parseFromString(html, 'text/html').body
  }

  componentLoaders: ComponentLoader[]
  formatLoaders: FormatLoader<any>[]
  attributeLoaders: AttributeLoader<any>[]

  constructor(@Inject(EDITOR_OPTIONS) private options: ViewOptions,
              private injector: Injector) {
    const componentLoaders = [
      ...(options.componentLoaders || [])
    ]
    const formatLoaders = [
      ...(options.formatLoaders || [])
    ]
    const attributeLoaders = [
      ...(options.attributeLoaders || [])
    ]
    options.imports?.forEach(i => {
      componentLoaders.push(...(i.componentLoaders || []))
      formatLoaders.push(...(i.formatLoaders || []))
    })
    this.componentLoaders = componentLoaders
    this.formatLoaders = formatLoaders
    this.attributeLoaders = attributeLoaders
  }

  parseDoc(html: string, rootComponentLoader: ComponentLoader) {
    const element = Parser.parseHTML(html)
    return rootComponentLoader.read(element, this.injector, (childSlot, childElement) => {
      return this.readSlot(childSlot, childElement)
    })
  }

  parse(html: string, rootSlot: Slot) {
    const element = Parser.parseHTML(html)
    return this.readFormats(element, rootSlot)
  }

  private readComponent(el: Node, slot: Slot) {
    if (el.nodeType === Node.ELEMENT_NODE) {
      if ((el as HTMLElement).tagName === 'BR') {
        slot.insert('\n')
        return
      }
      for (const t of this.componentLoaders) {
        if (t.match(el as HTMLElement)) {
          const result = t.read(el as HTMLElement, this.injector, (childSlot, childElement) => {
            return this.readSlot(childSlot, childElement)
          })
          if (result instanceof Slot) {
            result.toDelta().forEach(i => slot.insert(i.insert, i.formats))
            return
          }
          slot.insert(result)
          return
        }
      }
      this.readFormats(el as HTMLElement, slot)
    } else if (el.nodeType === Node.TEXT_NODE) {
      const textContent = el.textContent
      if (/^\s*[\r\n]+\s*$/.test(textContent as string)) {
        return
      }
      slot.insert(textContent as string)
    }
  }

  private readFormats(el: HTMLElement, slot: Slot) {
    const formats = this.formatLoaders.filter(f => {
      return f.match(el)
    }).map(f => {
      return f.read(el)
    })
    const startIndex = slot.index
    Array.from(el.childNodes).forEach(child => {
      this.readComponent(child, slot)
    })
    const endIndex = slot.index
    this.applyFormats(slot, formats.map<FormatItem<any>>(i => {
      return {
        formatter: i.formatter,
        value: i.value,
        startIndex,
        endIndex
      }
    }))
    slot.retain(endIndex)
    return slot
  }

  private readSlot<T extends Slot>(childSlot: T, childElement: HTMLElement): T {
    this.attributeLoaders.filter(a => {
      return a.match(childElement)
    }).forEach(a => {
      const r = a.read(childElement)
      childSlot.setAttribute(r.attribute, r.value)
    })
    this.readFormats(childElement, childSlot)
    return childSlot
  }

  private applyFormats(slot: Slot, formatItems: FormatItem<any>[]) {
    slot.background(() => {
      formatItems.forEach(i => {
        slot.retain(i.startIndex)
        slot.retain(i.endIndex - i.startIndex, i.formatter, i.value)
      })
    })
  }
}
