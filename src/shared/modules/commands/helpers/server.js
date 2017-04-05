import { splitStringOnFirst, splitStringOnLast } from 'services/commandUtils'
import * as connections from 'shared/modules/connections/connectionsDuck'
import { add as addFrameAction } from 'shared/modules/stream/streamDuck'
import { CONNECTION_ID as DISCOVERY_CONNECTION_ID } from 'shared/modules/discovery/discoveryDuck'
import { UnknownCommandError, getErrorMessage, AddServerValidationError } from 'services/exceptions'

export function handleServerCommand (action, cmdchar, put, store) {
  const [serverCmd, props] = splitStringOnFirst(splitStringOnFirst(action.cmd.substr(cmdchar.length), ' ')[1], ' ')
  if (serverCmd === 'list') {
    return handleServerListCommand(action, cmdchar, put, store)
  }
  if (serverCmd === 'connect') {
    return connectToConnection(action, props, put, store)
  }
  if (serverCmd === 'disconnect') {
    return handleDisconnectCommand(action, props, put, store)
  }
  if (serverCmd === 'add') {
    return handleServerAddCommand(action, cmdchar, put, store)
  }
  if (serverCmd === 'user') {
    return handleUserCommand(action, props, cmdchar)
  }
  if (serverCmd === 'change-password') {
    return handleChangePasswordCommand(action, props, cmdchar)
  }
  return {...action, type: 'error', error: {message: getErrorMessage(UnknownCommandError(action.cmd))}}
}

function handleDisconnectCommand (action, cmdchar, put, store) {
  put(addFrameAction({...action, type: 'disconnect'}))
  const activeConnection = connections.getActiveConnection(store.getState())
  const disconnectAction = connections.disconnectAction(activeConnection)
  put(disconnectAction)
  return null
}

function handleServerListCommand (action, cmdchar, put, store) {
  const state = connections.getConnections(store.getState())
  return {...action, type: 'pre', result: JSON.stringify(state, null, 2)}
}

function handleUserCommand (action, props, cmdchar) {
  switch (props) {
    case 'list':
      return {...action, type: 'user-list'}
    case 'add':
      return {...action, type: 'user-add'}
  }
}

function handleChangePasswordCommand (action, props, cmdchar) {
  return {...action, type: 'change-password'}
}

export function connectToConnection (action, connectionName, put, store) {
  const state = store.getState()
  connectionName = connectionName || DISCOVERY_CONNECTION_ID
  const foundConnections = connections.getConnections(state).filter((c) => c.name === connectionName)
  const connectionData = foundConnections[0] || {}
  return {...action, type: 'connection', connectionData}
}

function handleServerAddCommand (action, cmdchar, put, store) {
  // :server add name username:password@host:port
  const [serverCmd, props] = splitStringOnFirst(splitStringOnFirst(action.cmd.substr(cmdchar.length), ' ')[1], ' ')
  const [name, creds] = splitStringOnFirst(props, ' ')
  let [userCreds, host] = splitStringOnLast(creds, '@')
  const [username, password] = splitStringOnFirst(userCreds, ':')
  try {
    if (!serverCmd || !props) throw new AddServerValidationError()
    if (!name || !creds) throw new AddServerValidationError()
    if (!userCreds || !host) throw new AddServerValidationError()
    if (!username || !password) throw new AddServerValidationError()
  } catch (e) {
    return {...action, type: 'error', error: {message: getErrorMessage(e)}}
  }
  host = 'bolt://' + host.replace(/bolt:\/\//, '')
  put(connections.addConnection({name, username, password, host}))
  const state = store.getState()
  return {...action, type: 'pre', result: JSON.stringify(connections.getConnections(state), null, 2)}
}