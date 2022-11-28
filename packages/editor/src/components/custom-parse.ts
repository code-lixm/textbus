interface userInfo {
  info: string
  name: string
}

type userList = userInfo[]

function parse(str = '') {
  const infoStr = str.split(';;')
  const userList = infoStr.map((itemStr) => {
    if (itemStr) {
      const [name, info] = itemStr.split('&&')
      return { name, info }
    }
    return itemStr
  })
  userList.pop()
  return userList as userList
}

function stringify(userList: userList) {
  let str = ''
  userList.forEach(({ info, name }) => {
    const itemStr = `${name}&&${info};;`
    str += itemStr
  })
  return str
}

export { parse, stringify,userList }
