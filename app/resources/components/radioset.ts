/**
 * Set of radio buttons.
 * @module
 */
import van from "mini-van-plate/van-plate";

const { div, input, label } = van.tags;

interface Props {
  name: string;
  options: string[];
  checked?: string;
}

export default ({ name, options, checked }: Props) =>
  options.map((option) =>
    div(
      { class: "radio" },
      input({
        type: "radio",
        name,
        value: option,
        id: option,
        checked: option === checked,
        required: true,
      }),
      label({ for: option }, option),
    )
  );
