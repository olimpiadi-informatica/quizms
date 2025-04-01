import { Fragment } from "react";

import { BlocklyClient, type BlocklyProps } from "./blockly/workspace";
import { JsonArray, JsonField, JsonObject, Token } from "./json";

export function Blockly<State = any>(props: BlocklyProps<State>) {
  return (
    <>
      {props.testcases?.map((_, i) => (
        <Fragment key={i}>
          {i !== 0 && <Token value="},{" />}
          <JsonField field="id" value={i + 1} />
          <JsonField field="type" value="text" />
          <JsonField field="options">
            <JsonArray>
              <JsonObject>
                <JsonField field="value" value="✅" />
                <JsonField field="correct" value={true} />
              </JsonObject>
              <JsonObject>
                <JsonField field="value" value="❌" />
                <JsonField field="correct" value={false} />
              </JsonObject>
            </JsonArray>
          </JsonField>
        </Fragment>
      ))}
      <BlocklyClient {...props} />
    </>
  );
}
