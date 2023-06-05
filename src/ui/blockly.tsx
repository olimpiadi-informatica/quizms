import React, { useState } from "react";

import { default as BlocklyCore, BlocklyOptions } from "blockly/core";
import { javascriptGenerator } from "blockly/javascript";
import locale from "blockly/msg/it";
import { BlocklyWorkspace } from "react-blockly";

import toolboxConfiguration from "./blocklyToolbox.json";

BlocklyCore.setLocale(locale);

const initialXml = `
  <xml xmlns="https://developers.google.com/blockly/xml">
    <variables>
      <variable id="|1wI{o/;SqXBeiNyBI-R">x</variable>
    </variables>
    <block type="variables_set" id="=R?x#bgFYSjxxmk?xW/\`" x="100" y="85">
      <field name="VAR" id="|1wI{o/;SqXBeiNyBI-R">x</field>
      <value name="VALUE">
        <block type="math_number" id="Cg7X{bc{AytvV{uh+U,^">
          <field name="NUM">42</field>
        </block>
      </value>
      <next>
        <block type="text_print" id="#r@VE|fnLSQv7V$k@*hW">
          <value name="TEXT">
            <shadow type="text" id="uTLm1,GCrkXKDSz:EAV4">
              <field name="TEXT">abc</field>
            </shadow>
            <block type="variables_get" id="VV87uc3E2_DIryh@bGCQ">
              <field name="VAR" id="|1wI{o/;SqXBeiNyBI-R">x</field>
            </block>
          </value>
        </block>
      </next>
    </block>
  </xml>
`;

export function Blockly() {
  const [xml, setXml] = useState(initialXml);

  const isDark =
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

  const workspaceConfiguration: BlocklyOptions = {
    renderer: "zelos",
    sounds: false,
    zoom: {
      controls: true,
      startScale: 0.8,
    },
  };

  return (
    <div className="overflow-hidden rounded-xl border-2 border-[#c6c6c6]">
      <BlocklyWorkspace
        toolboxConfiguration={toolboxConfiguration}
        workspaceConfiguration={workspaceConfiguration}
        initialXml={xml}
        onXmlChange={setXml}
        className="h-[30rem] border-0 text-slate-700"
      />
    </div>
  );
}
