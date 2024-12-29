import { type ComponentType, Suspense, lazy } from "react";

import { AG_GRID_LOCALE_IT } from "@ag-grid-community/locale";
import type { AgGridReactProps } from "@ag-grid-community/react/dist/types/src/shared/interfaces";
import { Navbar, NavbarBrand } from "@olinfo/react-components";
import type { FirebaseOptions } from "firebase/app";

import { Loading } from "~/web/components";

import { FirebaseLogin } from "./common/base-login";
import { statsConverter } from "./common/converters";
import { useDocument } from "./hooks";

const AgGridReact: ComponentType<AgGridReactProps> = lazy(() => import("~/web/components/ag-grid"));

export function FirebaseStats({ config }: { config: FirebaseOptions }) {
  return (
    <FirebaseLogin config={config}>
      <Navbar color="bg-base-300 text-base-content">
        <NavbarBrand>
          <div className="flex items-center h-full font-bold">Olimpiadi di Matematica</div>
        </NavbarBrand>
      </Navbar>
      <div className="mx-auto flex w-full max-w-screen-xl grow flex-col p-4">
        <StatsTable />
      </div>
    </FirebaseLogin>
  );
}

export function StatsTable() {
  const [stats] = useDocument("stats", "stats", statsConverter);

  return (
    <Suspense fallback={<Loading />}>
      <div className="ag-theme-quartz-auto-dark relative grow">
        <div className="absolute inset-0">
          <AgGridReact
            rowData={stats.rows}
            columnDefs={stats.cols}
            rowSelection="single"
            readOnlyEdit={true}
            enableBrowserTooltips={true}
            localeText={AG_GRID_LOCALE_IT}
          />
        </div>
      </div>
    </Suspense>
  );
}
