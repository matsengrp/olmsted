import { combineReducers } from "redux";
import metadata from "./metadata";
import tree from "./tree";
import controls from "./controls";
import browserDimensions from "./browserDimensions";
import notifications from "./notifications";
import datasets from "./datasets";
import clonalFamilies from "./clonalFamilies";
import narrative from "./narrative";

const rootReducer = combineReducers({
  metadata,
  tree,
  controls,
  browserDimensions,
  notifications,
  datasets,
  clonalFamilies,
  narrative
});

export default rootReducer;
