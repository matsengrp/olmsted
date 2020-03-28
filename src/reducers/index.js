import { combineReducers } from "redux";
import browserDimensions from "./browserDimensions";
import datasets from "./datasets";
import clonalLineages from "./clonalLineages";
import trees from "./trees";

const rootReducer = combineReducers({
  browserDimensions,
  datasets,
  clonalLineages,
  trees
});

export default rootReducer;
