import { type ComponentType, lazy } from "react";

import type { AgGridReactProps } from "ag-grid-react";

export const AgGrid: ComponentType<AgGridReactProps> = lazy(
  () => import("~/web/components/ag-grid"),
);
