import uuid from 'uuid'
import { USER_CLEAR, APP_START } from 'shared/modules/app/appDuck'
import { getBrowserName } from 'services/utils'

export const NAME = 'documents'

export const ADD_FAVORITE = 'favorites/ADD_FAVORITE'
export const REMOVE_FAVORITE = 'favorites/REMOVE_FAVORITE'
export const LOAD_FAVORITES = 'favorites/LOAD_FAVORITES'
export const SYNC_FAVORITES = 'favorites/SYNC_FAVORITES'

import {scripts as staticScriptsList} from './staticScripts'

export const getFavorites = (state) => state[NAME]

// reducer
const initialState = staticScriptsList.map(script => Object.assign({}, script, {isStatic: true}))

export default function reducer (state = initialState, action) {
  switch (action.type) {
    case REMOVE_FAVORITE:
      return state.filter((favorite) => favorite.id !== action.id)
    case ADD_FAVORITE:
      return state.concat([{id: uuid.v4(), content: action.cmd}])
    case LOAD_FAVORITES:
      return mergeFavorites(initialState, action.favorites)
    case USER_CLEAR:
      return initialState
    case APP_START:
      return mergeFavorites(initialState, state)
    default:
      return state
  }
}

export function removeFavorite (id) {
  return {
    type: REMOVE_FAVORITE,
    id
  }
}
export function addFavorite (cmd) {
  return {
    type: ADD_FAVORITE,
    cmd
  }
}
export function loadFavorites (favorites) {
  return {
    type: LOAD_FAVORITES,
    favorites
  }
}
export function syncFavorites (favorites) {
  return {
    type: SYNC_FAVORITES,
    favorites
  }
}

export const composeDocumentsToSync = (store, syncValue) => {
  const documents = syncValue.syncObj.documents
  const favorites = getFavorites(store.getState()).filter(fav => !fav.isStatic)

  documents.unshift({
    'client': getBrowserName(),
    'data': favorites,
    'syncedAt': Date.now()
  })
  return documents
}

export const mergeFavorites = (list1, list2) => {
  return list1.concat(list2.filter(favInList2 => list1.findIndex(favInList1 => favInList1.id === favInList2.id) < 0))
}

export const favoritesToLoad = (action, store) => {
  let favoritesFromSync = (action.obj.syncObj && action.obj.syncObj.documents.length > 0)
    ? (action.obj.syncObj.documents[0].data || [])
    : null

  if (favoritesFromSync) {
    const existingFavs = getFavorites(store.getState())
    const allFavorites = mergeFavorites(favoritesFromSync, existingFavs)

    if (existingFavs.every(exFav => exFav.isStatic || favoritesFromSync.findIndex(syncFav => syncFav.id === exFav.id) >= 0)) {
      return { favorites: allFavorites, syncFavorites: false, loadFavorites: true }
    } else {
      return { favorites: allFavorites, syncFavorites: true, loadFavorites: true }
    }
  } else {
    return { favorites: null, syncFavorites: false, loadFavorites: false }
  }
}
