import van from "mini-van-plate/van-plate";

const { a, nav, p, header, h1 } = van.tags;

interface Props {
  path: string;
  title: string;
  description: string;
}

export default ({ description, path, title }: Props) => {
  const button = (props: { href: string }, text: string) =>
    a(
      props.href === path
        ? { class: "current", href: props.href }
        : { href: props.href },
      text,
    );
  return header(
    nav(
      button({ href: "/" }, "Home"),
      button({ href: "/app/docs" }, "App"),
      a({ href: "https://github.com/hasundue/lophus" }, "GitHub"),
    ),
    h1(title),
    p(description),
  );
};
