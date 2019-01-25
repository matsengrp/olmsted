import { combineReducers } from "redux";
import browserDimensions from "./browserDimensions";
import datasets from "./datasets";
import clonalFamilies from "./clonalFamilies";
import reconstructions from "./reconstructions";

const rootReducer = combineReducers({
  browserDimensions,
  datasets,
  clonalFamilies,
  reconstructions
});

export default rootReducer;
