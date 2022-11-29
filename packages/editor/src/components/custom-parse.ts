interface userInfo {
  authId: string
  username: string
}

type userList = userInfo[]

function parse(str = '') {
  const infoStr = str.split(';;')
  const userList = infoStr.map((itemStr) => {
    if (itemStr) {
      const [username, authId] = itemStr.split('&&')
      return { username, authId }
    }
    return itemStr
  })
  userList.pop()
  return userList as userList
}

function stringify(userList: userList) {
  let str = ''
  userList.forEach(({ authId, username }) => {
    const itemStr = `${username}&&${authId};;`
    str += itemStr
  })
  return str
}

export { parse, stringify, userList }
