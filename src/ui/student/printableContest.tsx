import React, { ComponentType, useState, useEffect } from "react";
import { components } from "~/ui/mdxComponents";
import { useStudent } from "./provider";

export function PrintableContest()
{
  const [Contest, setContest] = useState<ComponentType>();
	const student = useStudent();
	const variant = student.variant;
	const url = `/variant.js?variant=${variant}`;

	import(/* @vite-ignore */ url).then(({ default: contest }) => {
		setContest(() => contest(React, components));
	});
  if (Contest) return Contest;
  return <></>
}
