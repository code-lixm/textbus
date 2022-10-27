import { distinctUntilChanged, fromEvent, Observable, Subject, Subscription } from '@tanbo/stream'
import { Scheduler, Rect } from '@textbus/core'

import { createElement } from '../_utils/uikit'
import { Caret, CaretPosition, Scroller } from './types'

export function getLayoutRectByRange(range: Range): Rect {
  const { startContainer, startOffset } = range
  if (startContainer.nodeType === Node.ELEMENT_NODE) {
    const beforeNode = startContainer.childNodes[startOffset - 1]
    if (beforeNode) {
      const rect = (beforeNode as HTMLElement).getBoundingClientRect()
      return {
        left: rect.right,
        top: rect.top,
        width: rect.width,
        height: rect.height
      }
    }
    const offsetNode = startContainer.childNodes[startOffset]
    let isInsertBefore = false
    if (!offsetNode) {
      const lastChild = startContainer.lastChild
      if (lastChild && lastChild.nodeType === Node.ELEMENT_NODE) {
        const rect = (lastChild as HTMLElement).getBoundingClientRect()
        return {
          left: rect.right,
          top: rect.top,
          width: rect.width,
          height: rect.height
        }
      }
    }
    if (offsetNode) {
      if (offsetNode.nodeType === Node.ELEMENT_NODE && offsetNode.nodeName.toLowerCase() !== 'br') {
        return (offsetNode as HTMLElement).getBoundingClientRect()
      }
      isInsertBefore = true
    }
    const span = startContainer.ownerDocument!.createElement('span')
    span.innerText = '\u200b'
    span.style.display = 'inline-block'
    if (isInsertBefore) {
      startContainer.insertBefore(span, offsetNode)
    } else {
      startContainer.appendChild(span)
    }
    const rect = span.getBoundingClientRect()
    startContainer.removeChild(span)
    return rect
  }
  return range.getBoundingClientRect()
}

interface CaretStyle {
  height: string
  lineHeight: string
  fontSize: string
}

export class ExperimentalCaret implements Caret {
  onPositionChange: Observable<CaretPosition | null>
  onStyleChange: Observable<CaretStyle>
  elementRef: HTMLElement

  get rect() {
    return this.caret.getBoundingClientRect()
  }

  private timer: any = null
  private caret: HTMLElement
  private oldPosition: CaretPosition | null = null

  private set display(v: boolean) {
    this._display = v
    this.caret.style.visibility = v ? 'visible' : 'hidden'
  }

  private get display() {
    return this._display
  }

  private _display = true
  private flashing = true

  private subs: Subscription[] = []

  private positionChangeEvent = new Subject<CaretPosition | null>()
  private styleChangeEvent = new Subject<CaretStyle>()
  private oldRange: Range | null = null

  private isFixed = false

  constructor(
    private scheduler: Scheduler,
    private editorMask: HTMLElement) {
    this.onPositionChange = this.positionChangeEvent.pipe(distinctUntilChanged())
    this.onStyleChange = this.styleChangeEvent.asObservable()
    this.elementRef = createElement('div', {
      styles: {
        position: 'absolute',
        width: '2px',
        pointerEvents: 'none'
      },
      children: [
        this.caret = createElement('span', {
          styles: {
            width: '100%',
            height: '100%',
            position: 'absolute',
            left: 0,
            top: 0
          }
        })
      ]
    })

    this.subs.push(
      fromEvent(document, 'mousedown').subscribe(() => {
        this.flashing = false
      }),
      fromEvent(document, 'mouseup').subscribe(() => {
        this.flashing = true
      }),
    )
    this.editorMask.appendChild(this.elementRef)
  }

  refresh(isFixedCaret = false) {
    this.isFixed = isFixedCaret
    if (this.oldRange) {
      this.show(this.oldRange, false)
    }
    this.isFixed = false
  }

  show(range: Range, restart: boolean) {
    const oldRect = this.elementRef.getBoundingClientRect()
    this.oldPosition = {
      top: oldRect.top,
      left: oldRect.left,
      height: oldRect.height
    }
    this.oldRange = range
    if (restart || this.scheduler.lastChangesHasLocalUpdate) {
      clearTimeout(this.timer)
    }
    this.updateCursorPosition(range)
    if (range.collapsed) {
      if (restart || this.scheduler.lastChangesHasLocalUpdate) {
        this.display = true
        const toggleShowHide = () => {
          this.display = !this.display || !this.flashing
          this.timer = setTimeout(toggleShowHide, 400)
        }
        clearTimeout(this.timer)
        this.timer = setTimeout(toggleShowHide, 400)
      }
    } else {
      this.display = false
      clearTimeout(this.timer)
    }
  }

  hide() {
    this.display = false
    clearTimeout(this.timer)
    this.positionChangeEvent.next(null)
  }

  destroy() {
    clearTimeout(this.timer)
    this.subs.forEach(i => i.unsubscribe())
  }

  correctScrollTop(scroller: Scroller) {
    this.subs.forEach(i => i.unsubscribe())
    this.subs = []
    const scheduler = this.scheduler
    let docIsChanged = true

    function limitPosition(position: CaretPosition) {
      const { top, bottom } = scroller.getLimit()
      const caretTop = position.top
      if (caretTop + position.height > bottom) {
        const offset = caretTop - bottom + position.height
        scroller.setOffset(offset)
      } else if (position.top < top) {
        scroller.setOffset(-(top - position.top))
      }
    }

    let isPressed = false

    this.subs.push(
      scroller.onScroll.subscribe(() => {
        if (this.oldPosition) {
          const rect = this.rect
          this.oldPosition.top = rect.top
          this.oldPosition.left = rect.left
          this.oldPosition.height = rect.height
        }
      }),
      fromEvent(document, 'mousedown', true).subscribe(() => {
        isPressed = true
      }),
      fromEvent(document, 'mouseup', true).subscribe(() => {
        isPressed = false
      }),
      scheduler.onDocChange.subscribe(() => {
        docIsChanged = true
      }),
      this.onPositionChange.subscribe(position => {
        if (position) {
          if (docIsChanged) {
            if (scheduler.lastChangesHasLocalUpdate) {
              limitPosition(position)
            } else if (this.oldPosition) {
              const offset = Math.floor(position.top - this.oldPosition.top)
              scroller.setOffset(offset)
            }
          } else if (!isPressed) {
            if (this.isFixed && this.oldPosition) {
              const offset = Math.floor(position.top - this.oldPosition.top)
              scroller.setOffset(offset)
            } else {
              limitPosition(position)
            }
          }
        }
        docIsChanged = false
      })
    )
  }

  private updateCursorPosition(nativeRange: Range) {
    const startContainer = nativeRange.startContainer

    const node = (startContainer.nodeType === Node.ELEMENT_NODE ? startContainer : startContainer.parentNode) as HTMLElement
    if (node?.nodeType !== Node.ELEMENT_NODE || !nativeRange.collapsed) {
      this.positionChangeEvent.next(null)
      return
    }
    const rect = getLayoutRectByRange(nativeRange)
    const { fontSize, lineHeight, color } = getComputedStyle(node)

    let height: number
    if (isNaN(+lineHeight)) {
      const f = parseFloat(lineHeight)
      if (isNaN(f)) {
        height = parseFloat(fontSize)
      } else {
        height = f
      }
    } else {
      height = parseFloat(fontSize) * parseFloat(lineHeight)
    }

    const boxHeight = Math.floor(Math.max(height, rect.height))
    // const boxHeight = Math.floor(height)

    let rectTop = rect.top
    if (rect.height < height) {
      rectTop -= (height - rect.height) / 2
    }

    rectTop = Math.floor(rectTop)

    const containerRect = this.editorMask.getBoundingClientRect()

    const top = Math.floor(rectTop - containerRect.top)
    const left = Math.floor(rect.left - containerRect.left)

    Object.assign(this.elementRef.style, {
      left: left + 'px',
      top: top + 'px',
      height: boxHeight + 'px',
      lineHeight: boxHeight + 'px',
      fontSize
    })

    this.caret.style.backgroundColor = color
    this.styleChangeEvent.next({
      height: boxHeight + 'px',
      lineHeight: boxHeight + 'px',
      fontSize
    })
    this.positionChangeEvent.next({
      left,
      top: rectTop,
      height: boxHeight
    })
  }
}
