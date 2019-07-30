import { combineReducers } from "redux";
import browserDimensions from "./browserDimensions";
import datasets from "./datasets";
import clonalFamilies from "./clonalFamilies";
import trees from "./trees";

const rootReducer = combineReducers({
  browserDimensions,
  datasets,
  clonalFamilies,
  trees
});

export default rootReducer;
