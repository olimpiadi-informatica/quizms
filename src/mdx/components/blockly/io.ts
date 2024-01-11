import { range } from "lodash-es";

export class Input {
  private readonly tokens: string[];
  private index = 0;

  constructor(text: string) {
    this.tokens = text.split("\n").flatMap((line) => line.trim().split(/\s+/));
  }

  public readInt = (): number => {
    if (this.index >= this.tokens.length) {
      throw new Error("Non ci sono abbastanza numeri in input");
    }
    const value = Number(this.tokens[this.index++]);
    if (isNaN(value)) {
      throw new Error("Il valore in input non è un numero");
    }
    return value;
  };

  public readArrayInt = (length: number): number[] => {
    return range(length).map(this.readInt);
  };
}

export class Output {
  private readonly MAX_OUTPUT_LENGTH = 3000;
  private readonly MAX_OUTPUT_LINES = 100;

  private lineCount = 0;
  private length = 0;

  constructor(private onOutput: (value: string) => void) {}

  public writeAny = (value: any) => {
    if (Array.isArray(value)) {
      value = value.join(" ") + "\n";
    } else {
      value = `${value}\n`;
    }

    this.length += value.length;
    this.lineCount += 1;

    if (this.lineCount > this.MAX_OUTPUT_LINES) {
      throw new Error("Output troppo lungo");
    }
    if (this.length > this.MAX_OUTPUT_LENGTH) {
      throw new Error("Output troppo lungo");
    }

    this.onOutput(value);
  };
}
