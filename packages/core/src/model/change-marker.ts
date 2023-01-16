import { Observable, Subject } from '@tanbo/stream'

import { ComponentInstance } from './component'
import { Operation } from './types'

/**
 * 用来标识组件或插槽的数据变化
 */
export class ChangeMarker {
  onChange: Observable<Operation>
  onForceChange: Observable<void>
  onChildComponentRemoved: Observable<ComponentInstance>

  get dirty() {
    return this._dirty
  }

  get changed() {
    return this._changed
  }

  get outputDirty() {
    return this._outputDirty
  }

  get outputChanged() {
    return this._outputChanged
  }

  private _dirty = true
  private _changed = true
  private _outputDirty = true
  private _outputChanged = true
  private changeEvent = new Subject<Operation>()
  private childComponentRemovedEvent = new Subject<ComponentInstance>()
  private forceChangeEvent = new Subject<void>()

  constructor() {
    this.onChange = this.changeEvent.asObservable()
    this.onChildComponentRemoved = this.childComponentRemovedEvent.asObservable()
    this.onForceChange = this.forceChangeEvent.asObservable()
  }

  forceMarkDirtied() {
    if (this._dirty) {
      return
    }
    this._dirty = true
    this.forceMarkChanged()
  }

  forceMarkChanged() {
    if (this._changed) {
      return
    }
    this._changed = true
    this.forceChangeEvent.next()
  }

  markAsDirtied(operation: Operation) {
    this._dirty = true
    this._outputDirty = true
    this.markAsChanged(operation)
  }

  markAsChanged(operation: Operation) {
    this._changed = true
    this._outputChanged = true
    this.changeEvent.next(operation)
  }

  rendered() {
    this._dirty = this._changed = false
  }

  outputRendered() {
    this._outputDirty = this._outputChanged = false
  }

  reset() {
    this._changed = this._dirty = this._outputChanged = this._outputDirty = true
  }

  recordComponentRemoved(instance: ComponentInstance) {
    this.childComponentRemovedEvent.next(instance)
  }
}
