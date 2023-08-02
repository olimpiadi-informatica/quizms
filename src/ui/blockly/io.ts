import { Dispatch, SetStateAction } from "react";

import _ from "lodash";

export class Input {
  private readonly tokens: string[];
  private index = 0;

  constructor(text: string) {
    this.tokens = _(text)
      .split("\n")
      .flatMap((line) => _(line).trim().split(/\s+/))
      .value();
  }

  public readInt = (): number => {
    if (this.index >= this.tokens.length) {
      throw "Non ci sono abbastanza numeri in input";
    }
    return parseInt(this.tokens[this.index++]);
  };

  public readArrayInt = (length: number): number[] => {
    return _.range(length).map(this.readInt);
  };
}

export class Output {
  private readonly setOutput: Dispatch<SetStateAction<string>>;

  constructor(setOutput: Dispatch<SetStateAction<string>>) {
    this.setOutput = setOutput;
  }

  public writeAny = (value: any) => {
    if (Array.isArray(value)) {
      this.setOutput((prev) => `${prev}${_(value).map(this.writeAny).join(" ")}\n`);
    } else {
      this.setOutput((prev) => `${prev}${value}\n`);
    }
  };
}
