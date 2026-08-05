import { combineReducers } from "redux";
import browserDimensions from "./browserDimensions";
import datasets from "./datasets";
import clonalFamilies from "./clonalFamilies";
import trees from "./trees";
import configs from "./configs";
import tableColumns from "./tableColumns";

const rootReducer = combineReducers({
  browserDimensions,
  datasets,
  clonalFamilies,
  trees,
  configs,
  tableColumns
});

export default rootReducer;
