import { createElement, type ElementType, type Key } from "react";

import { isString } from "lodash-es";

export { Fragment } from "react";

export function jsx(type: ElementType, props: object, key?: Key) {
  return isString(type) ? null : createElement(type, { ...props, key });
}

export function jsxs(type: ElementType, props: object, key?: Key) {
  return isString(type) ? null : createElement(type, { ...props, key });
}
