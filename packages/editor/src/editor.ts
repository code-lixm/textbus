import { Provider, Type } from '@tanbo/di'
import { fromEvent, fromPromise, Observable, of, Subject } from '@tanbo/stream'
import { makeError, Selection, Starter } from '@textbus/core'
import { Input, Viewer } from '@textbus/browser'

import { EditorOptions } from './types'
import { rootComponent, rootComponentLoader } from './root.component'
import { Layout } from './layout'
import { I18n } from './i18n'
import { i18n_zh_CN } from './i18n/zh_CN'
import { Dialog } from './dialog'
import { Message } from './message'
import { FileUploader, UploadConfig } from './file-uploader'

const editorErrorFn = makeError('Editor')

/**
 * 基于 Textbus 内核和 PC 浏览器中间层的富文本实现
 */
export class Editor extends Viewer {
  /** 编辑器是否初始化完成可观察对象 */
  onReady: Observable<Starter>
  /** 编辑器 UI 布局相关的 DOM 对象管理类 */
  layout: Layout

  private host: HTMLElement | null = null

  private readyEvent = new Subject<Starter>()

  constructor(options: EditorOptions = {}) {
    super(
      options.rootComponent || rootComponent,
      options.rootComponentLoader || rootComponentLoader,
      (() => {
        const editorProviders: Provider[] = [{
          provide: Layout,
          useFactory: () => {
            return this.layout
          }
        }, {
          provide: I18n,
          useValue: new I18n(i18n_zh_CN, options.i18n as any)
        }, {
          provide: Editor,
          useFactory: () => {
            return this
          }
        }, {
          provide: FileUploader,
          useFactory(selection: Selection, message: Message, i18n: I18n) {
            return {
              upload: (config: UploadConfig): Observable<string | string[]> => {
                if (!selection.isSelected) {
                  selection.usePaths({
                    anchor: [0, 0],
                    focus: [0, 0],
                  })
                  selection.restore()
                }
                if (typeof options.uploader === 'function') {
                  const result = options.uploader(config)
                  if (result instanceof Observable) {
                    return result
                  } else if (result instanceof Promise) {
                    return fromPromise(result)
                  } else if (typeof result === 'string') {
                    return of(result)
                  } else if (Array.isArray(result)) {
                    return of(result)
                  }
                }
                message.message(i18n.get('editor.noUploader'))
                return config.multiple ? of([]) : of('')
              }
            }
          },
          deps: [Selection, Message, I18n]
        },
          Dialog,
          Message
        ]
        options.providers = options.providers || []
        options.providers.push(...editorProviders)

        options.editingStyleSheets = options.editingStyleSheets || []
        options.editingStyleSheets.push(
          '[textbus-document=true]::before {content: attr(data-placeholder); position: absolute; opacity: 0.6;}'
        )
        return options
      })()
    )
    this.onReady = this.readyEvent.asObservable()
    this.layout = new Layout(options.autoHeight)
    if (options.theme) {
      this.layout.setTheme(options.theme)
    }

    if (options.autoHeight) {
      this.layout.scroller.style.overflow = 'visible'
    }
  }

  override mount(selector: string | HTMLElement): Promise<this> {
    if (typeof selector === 'string') {
      this.host = document.querySelector(selector)!
    } else {
      this.host = selector
    }
    if (!this.host || !(this.host instanceof HTMLElement)) {
      throw editorErrorFn('selector is not an HTMLElement, or the CSS selector cannot find a DOM element in the document.')
    }
    this.host.append(this.layout.container)
    return super.mount(this.layout.scroller).then(rootInjector => {
      if (this.destroyed) {
        return rootInjector
      }
      if (!(this.options as EditorOptions).autoHeight) {
        const scrollContainer = this.layout.scroller
        const input = rootInjector.get(Input)
        input.caret.correctScrollTop({
          onScroll: fromEvent(scrollContainer, 'scroll'),
          getLimit() {
            const rect = scrollContainer.getBoundingClientRect()
            return {
              top: rect.top,
              bottom: rect.top + rect.height
            }
          },
          setOffset(offset: number) {
            scrollContainer.scrollTop += offset
          }
        })
      }
      this.readyEvent.next(rootInjector)
      return rootInjector
    })
  }

  override destroy() {
    if (this.destroyed) {
      return
    }
    const types = [
      Dialog
    ]

    types.forEach(i => {
      this.get(i as Type<{ destroy(): void }>).destroy()
    })
    this.layout.destroy()
    this.layout.container.parentNode?.removeChild(this.layout.container)
    super.destroy()
  }
}
