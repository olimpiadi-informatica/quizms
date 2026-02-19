import { Fragment } from "react";

import { Blockly as BlocklyClient, type BlocklyProps } from "../blockly/workspace";
import { JsonArray, JsonField, JsonObject, Token } from "./json";

export function Blockly<State = any>(props: BlocklyProps<State>) {
  return (
    <>
      {props.testcases?.map((_, i) => (
        <Fragment key={i}>
          {i !== 0 && <Token value="},{" />}
          <JsonField field="id" value={i + 1} />
          <JsonField field="type" value="text" />
          <JsonField field="kind" value="anyCorrect" />
          <JsonField field="options">
            <JsonArray>
              <JsonObject>
                <JsonField field="value" value="✅" />
                <JsonField field="correct" value={true} />
                <JsonField field="originalId" value="✅" />
              </JsonObject>
              <JsonObject>
                <JsonField field="value" value="❌" />
                <JsonField field="correct" value={false} />
                <JsonField field="originalId" value="❌" />
              </JsonObject>
            </JsonArray>
          </JsonField>
        </Fragment>
      ))}
      <BlocklyClient {...props} />
    </>
  );
}
Blockly.displayName = "Blockly";
