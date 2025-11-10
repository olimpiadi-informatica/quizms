import { Suspense, useMemo } from "react";

import { AgGrid, Loading } from "@olinfo/quizms/components";
import type { Participation, Student } from "@olinfo/quizms/models";
import type { CellEditRequestEvent, ColDef, ICellRendererParams } from "ag-grid-community";

import { participationConverter } from "~/web/common/converters";
import { useCollection } from "~/web/hooks";
import { useCount } from "~/web/hooks/count";

import { useAdmin } from "./context";

export function SchoolTable() {
  const { contest } = useAdmin();

  const [participations, setParticipation] = useCollection(
    "participations",
    participationConverter,
    {
      constraints: { contestId: contest.id },
      subscribe: true,
    },
  );

  const colDefs = useMemo(() => columnDefinition(), []);

  const onCellEditRequest = async (ev: CellEditRequestEvent) => {
    const participation = ev.data as Participation;
    if (ev.colDef.field === "finalized") {
      await setParticipation({ ...participation, finalized: ev.newValue });
    }
    ev.api.refreshCells({ force: true });
  };

  return (
    <Suspense fallback={<Loading />}>
      <div className="relative grow p-2">
        <div className="absolute inset-0">
          <AgGrid
            rowData={participations}
            getRowId={(row) => (row.data as Participation).id}
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
      cellRenderer: ({ data }: ICellRendererParams<Participation>) => {
        if (!data) return;
        return (
          <Suspense>
            <Count participationId={data.id} />
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

function Count({ participationId }: { participationId: string }) {
  return useCount<Student>(`participations/${participationId}/students`, {
    constraints: { disabled: false },
  });
}
