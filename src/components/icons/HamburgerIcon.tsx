import { IconBase, type IconProps } from './IconBase';

/**
 * Three stacked lines (hamburger) for the phone navigation toggle. It sits
 * inside a 44×44 px button that also carries the menu's accessible name;
 * swap it for CloseIcon while the menu is open.
 */
export function HamburgerIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </IconBase>
  );
}
