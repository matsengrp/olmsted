import { createStore, applyMiddleware, compose } from "redux";
import thunk from "redux-thunk";
import { changeURLMiddleware } from "../middleware/changeURL";
import rootReducer from "../reducers";
import { loggingMiddleware } from "../middleware/logActions"; // eslint-disable-line no-unused-vars

export default function configureStore(initialState) {
  console.log("configure store!")
  const middleware = [
    thunk,
    changeURLMiddleware, // eslint-disable-line comma-dangle
    //loggingMiddleware
  ]

  const actionSanitizer = (action) => {
    if (action.type === 'CLONAL_FAMILIES_RECEIVED' && action.clonalFamilies ){
      return { ...action, clonalFamilies: 'LARGE PAYLOAD, total families:'  + action.clonalFamilies.length } 
    }
    else{
      return action
    }
  }
  const stateSanitizer = (state) => {
    if ( state.clonalFamilies.clonalFamiliesDict ){
      let sumClonalFamiliesDict =  {}
      Object.entries(state.clonalFamilies.clonalFamiliesDict).forEach((pair) => {
        sumClonalFamiliesDict[pair[0]] = pair[1].length
      })
      return { ...state, clonalFamilies: {...state.clonalFamilies, clonalFamiliesDict: sumClonalFamiliesDict}}
    }
    return state
  }
  let composeEnhancers = compose;
  /* eslint-disable no-underscore-dangle */ 
  if(process.env.NODE_ENV !== 'production' && typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ){
    composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
      // Adding these to redux dev tools to handle huge action payload of clonal families
      actionSanitizer: actionSanitizer,
      stateSanitizer: stateSanitizer
    });
  }
      
  const composedEnhancers = composeEnhancers(
    applyMiddleware(...middleware)
  )
  /* eslint-enable */
  const store = createStore(rootReducer, initialState, composedEnhancers)
  if (process.env.NODE_ENV !== 'production' && module.hot) {
    console.log("hot reducer reload")

    module.hot.accept('../reducers', () => {
      const nextRootReducer = require('../reducers/index');
      store.replaceReducer(nextRootReducer);
    });
  }
  
  return store
}
