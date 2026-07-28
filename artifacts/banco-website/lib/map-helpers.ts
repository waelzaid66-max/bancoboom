import {
  clusterCacheKey,
  clusterToViewportPercent,
  type MapViewport,
  viewportCenter,
  boundsLiteralToViewport,
  buildMapClusterParams,
} from "@workspace/search-contract/map";
import { searchConfig } from "./search-config";

export {
  clusterCacheKey,
  clusterToViewportPercent,
  viewportCenter,
  boundsLiteralToViewport,
  buildMapClusterParams,
  type MapViewport,
};

export function getDefaultMapViewport(): MapViewport {
  return { ...searchConfig.map.defaultViewport };
}
