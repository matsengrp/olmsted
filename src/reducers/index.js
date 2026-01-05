import { combineReducers } from "redux";
import browserDimensions from "./browserDimensions";
import datasets from "./datasets";
import clonalFamilies from "./clonalFamilies";
import trees from "./trees";
import configs from "./configs";

const rootReducer = combineReducers({
  browserDimensions,
  datasets,
  clonalFamilies,
  trees,
  configs
});

export default rootReducer;
