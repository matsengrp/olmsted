import { combineReducers } from "redux";
import browserDimensions from "./browserDimensions";
import datasets from "./datasets";

const rootReducer = combineReducers({
  browserDimensions,
  datasets
});

export default rootReducer;
