import { combineReducers } from "redux";
import browserDimensions from "./browserDimensions";
import datasets from "./datasets";
import clonalFamilies from "./clonalFamilies";

const rootReducer = combineReducers({
  browserDimensions,
  datasets,
  clonalFamilies
});

export default rootReducer;
