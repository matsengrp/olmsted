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
    loggingMiddleware
  ]
   
  const composedEnhancers = compose(
    applyMiddleware(...middleware),
    window.devToolsExtension ? window.devToolsExtension() : (f) => f
  )
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
