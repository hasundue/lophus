/**
 * Convinience component for creating select inputs.
 * @module
 */

import van from "mini-van-plate/van-plate";

const { select, option } = van.tags;

interface Props {
  name: string;
  options: string[];
  placeholder?: string;
  selected?: string;
}

export default ({ name, options, placeholder, selected }: Props) =>
  select(
    { name },
    option({
      value: "",
      selected: selected === undefined,
      disabled: true,
    }, placeholder ?? ""),
    ...options.map((it) => option({ value: it }, it)),
  );
