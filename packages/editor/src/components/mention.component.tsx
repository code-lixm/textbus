import {
  Commander,
  ComponentInitData,
  ComponentInstance,
  ContentType,
  defineComponent,
  onBlur,
  onContentDelete,
  onDestroy,
  onViewInit,
  Selection,
  Slot,
  SlotRender,
  useContext,
  useRef,
  useSelf,
  useSlots,
  useState,
  VElement
} from '@textbus/core'
import { ComponentLoader, EDITOR_OPTIONS, SlotParser } from '@textbus/browser'
import { Injector } from '@tanbo/di'
import { EditorOptions } from '../types'
export interface MentionComponentOption {
  authId: string
  username: string
}

export interface MentionComponentState {
  isSelected: boolean
  username: string
  authId: string
}

export const mentionComponent = defineComponent({
  type: ContentType.InlineComponent,
  name: 'mentionComponent',
  setup(initData?: ComponentInitData<MentionComponentState>) {
    const self = useSelf()
    const slots = useSlots(
      initData?.slots || [new Slot([ContentType.InlineComponent])]
    )

    const injector = useContext()
    const selection = injector.get(Selection)
    const commander = injector.get(Commander)
    const options = injector.get(EDITOR_OPTIONS) as EditorOptions

    let state = initData?.state || {
      isSelected: false,
      authId: '',
      username: ''
    }
    let users = options.moduleAPI?.getShareUsers().slice() || []
    const currentUserInfo = options.moduleAPI?.getCurrentUserInfo() || {name: ''}

    const mentionMenu = useRef<HTMLElement>()
    const searchInput = useRef<HTMLElement>()

    const stateController = useState(state)
    const subscribe = stateController.onChange.subscribe((newState) => {
      state = newState
    })

    let searchText = ''

    onDestroy(() => {
      subscribe.unsubscribe()
    })

    // 组件初始化完成
    onViewInit(() => {
      if(state.isSelected) {
        mentionMenu.current!.style.display = 'none'
      }
      // 存在
      if (users.length) {
        searchInput.current?.focus()
        self.changeMarker.forceMarkDirtied()
      } else {
        // 不存在
        commander.removeComponent(self)
        commander.insert('@')
      }
    })

    // 初次删除为默认删除动作与搜索匹配 再次删除为删除组件动作
    onContentDelete((ev) => {
      if (state.isSelected) {
        commander.removeComponent(self)
        ev.preventDefault()
      }
    })

    onBlur(() => {
      mentionMenu.current!.style.display = 'none'
    })

    // 选择事件
    const onSelect = (option) => {
      const parentSlot = self.parent!
      const index = parentSlot.indexOf(self)

      if (parentSlot.parent?.name === 'TodolistComponent') {
        const userIsExists = parentSlot.state.userList.find(
          ({ authId }) => authId === option.authId
        )
        !userIsExists &&
          parentSlot.updateState((draft) => {
            draft.userList.push({ username: option.username, authId: option.authId })
          })
        commander.removeComponent(self)
        return
      }

      stateController.update((draft) => {
        draft.isSelected = true
        draft.authId = option.authId
        draft.username = option.username
      })

      selection.setPosition(parentSlot, index + 1)
      commander.insert(' ')

      mentionMenu.current!.style.display = 'none'
    }

    const onSearch = (ev) => {
      searchText = ev.target.value
      const searchedList = users.filter((item) =>
        item.username.includes(searchText)
      )
      const unSearchedList = users.filter(
        (item) => !item.username.includes(searchText)
      )
      users = [...searchedList, ...unSearchedList]
      self.changeMarker.forceMarkDirtied()
    }

    const onKeydown = (ev) => {
      // enter
      if (ev.keyCode === 13) {
        onSelect(users[0])
      }
      // escape
      if (ev.keyCode === 27) {
        commander.removeComponent(self)
        commander.insert('@' + searchText)
      }
    }

    return {
      render(_, slotRender: SlotRender): VElement {
        let classes = ''
        if(state.isSelected) {
          classes = state.username === currentUserInfo.name ? 'mention-selected-self' : 'mention-selected'
        }
        return (
          <span
            component-name="MentionComponent"
            class={classes}
            style={{ display: 'inline-block' }}
            data-authId={state.authId}
            data-username={state.username}
          >
            <span>
              @{state.username}
              <span style={{ position: 'relative' }} ref={mentionMenu}>
                <div
                  class="mention-menu"
                  style={{
                    zIndex: '1',
                    position: 'absolute',
                    left: '0px',
                    background: '#ffffff',
                    border: '1px solid #e8e8e8',
                    borderRadius: '4px',
                    padding: '8px',
                    top: '20px',
                    boxShadow: '0px 0px 5px rgba(0,0,0, 0.1)',
                    color: '#000'
                  }}
                >
                  <input
                    type="text"
                    placeholder="搜索"
                    ref={searchInput}
                    onInput={onSearch}
                    onKeydown={onKeydown}
                    style={{
                      paddingBottom: '4px',
                      marginBottom: '4px',
                      border: 'none',
                      outline: 'none',
                      borderBottom: '1px solid #e8e8e8'
                    }}
                  />
                  <div>
                    {users.map((option) => {
                      return (
                        <div
                          key={option.authId}
                          class='user-item'
                          style={{
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            minWidth: '100px',
                            padding: '4px'
                          }}
                          onClick={() => onSelect(option)}
                        >
                          {option.username}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </span>
            </span>
            {slotRender(slots.get(0)!, () => {
              return <span />
            })}
          </span>
        )
      }
    }
  }
})

export const mentionComponentLoader: ComponentLoader = {
  resources: {
    styles: [
      `
.mention-selected-self {
  border: 1px solid #3370ff;
  padding: 0 6px;
  border-radius: 18px;
  background-color: #3370ff;
  white-space: nowrap;
  color: #ffffff;
}
.mention-selected {
  border: 1px solid rgba(130, 167, 252, 0.18);
  padding: 0 6px;
  border-radius: 18px;
  white-space: nowrap;
  color: #ffffff;
  background-color: rgba(130, 167, 252, 0.18);
  color: #1f2329;
}
.mention-menu:hover {
  background: #f3f4f5;
}
.user-item:hover {
  background: #f3f4f5;
}
      `
    ]
  },
  match(element: HTMLElement): boolean {
    return (
      element.tagName === 'SPAN' &&
      element.getAttribute('component-name') === 'MentionComponent'
    )
  },
  read(
    element: HTMLElement,
    context: Injector,
    slotParser: SlotParser
  ): ComponentInstance {
    return mentionComponent.createInstance(context, {
      state: {
        isSelected: element.dataset.authId || '' ? true : false,
        authId: element.dataset.authId || '',
        username: element.dataset.username || ''
      },
      slots: [
        slotParser(
          new Slot([ContentType.InlineComponent]),
          element.children[0] as HTMLElement
        )
      ]
    })
  }
}
