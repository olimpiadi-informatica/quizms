import { AG_GRID_LOCALE_IT } from "@ag-grid-community/locale";
import {
  CheckboxEditorModule,
  ClientSideRowModelModule,
  DateEditorModule,
  DateFilterModule,
  LocaleModule,
  ModuleRegistry,
  NumberEditorModule,
  NumberFilterModule,
  RenderApiModule,
  RowSelectionModule,
  TextEditorModule,
  TextFilterModule,
  themeQuartz,
} from "ag-grid-community";
import { type AgGridReactProps, AgGridReact as UnStyledAgGrid } from "ag-grid-react";

ModuleRegistry.registerModules([
  CheckboxEditorModule,
  ClientSideRowModelModule,
  DateEditorModule,
  DateFilterModule,
  LocaleModule,
  NumberEditorModule,
  NumberFilterModule,
  RenderApiModule,
  RowSelectionModule,
  TextEditorModule,
  TextFilterModule,
]);

const theme = themeQuartz.withParams({
  backgroundColor: "var(--fallback-b1, oklch(var(--b1)))",
  foregroundColor: "var(--fallback-bc, oklch(var(--bc)))",
});

export default function AgGrid(props: AgGridReactProps) {
  return (
    <UnStyledAgGrid
      theme={theme}
      localeText={AG_GRID_LOCALE_IT}
      rowSelection={{ mode: "singleRow", checkboxes: false }}
      singleClickEdit
      readOnlyEdit
      enableBrowserTooltips
      {...props}
    />
  );
}
