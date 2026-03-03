import { Suspense, useMemo } from "react";

import { AgGrid, Loading } from "@olinfo/quizms/components";
import type { Student, Venue } from "@olinfo/quizms/models";
import type { CellEditRequestEvent, ColDef, ICellRendererParams } from "ag-grid-community";

import { venueConverter } from "~/web/common/converters";
import { useCollection } from "~/web/hooks";
import { useCount } from "~/web/hooks/count";

import { useAdmin } from "./context";

export function SchoolTable() {
  const { contest } = useAdmin();

  const [venues, setVenue] = useCollection("venues", venueConverter, {
    constraints: { contestId: contest.id },
  });

  const colDefs = useMemo(() => columnDefinition(), []);

  const onCellEditRequest = async (ev: CellEditRequestEvent) => {
    const venue = ev.data as Venue;
    if (ev.colDef.field === "finalized") {
      await setVenue({ ...venue, finalized: ev.newValue });
    }
    ev.api.refreshCells({ force: true });
  };

  return (
    <Suspense fallback={<Loading />}>
      <div className="relative grow p-2">
        <div className="absolute inset-0">
          <AgGrid
            rowData={venues}
            getRowId={(row) => (row.data as Venue).id}
            columnDefs={colDefs}
            onCellEditRequest={onCellEditRequest}
          />
        </div>
      </div>
    </Suspense>
  );
}

function columnDefinition(): ColDef[] {
  return [
    {
      field: "schoolId",
      headerName: "ID",
      width: 150,
      filter: true,
    },
    {
      field: "name",
      headerName: "Nome",
      minWidth: 200,
      flex: 1,
      filter: true,
    },
    {
      field: "count",
      headerName: "Studenti",
      width: 100,
      sortable: false,
      cellRenderer: ({ data }: ICellRendererParams<Venue>) => {
        if (!data) return;
        return (
          <Suspense>
            <Count venueId={data.id} />
          </Suspense>
        );
      },
    },
    {
      field: "finalized",
      headerName: "Finalizzato",
      width: 100,
      filter: true,
      cellDataType: "boolean",
      editable: true,
    },
  ];
}

function Count({ venueId }: { venueId: string }) {
  return useCount<Student>(`venues/${venueId}/students`, {
    constraints: { disabled: false },
  });
}
