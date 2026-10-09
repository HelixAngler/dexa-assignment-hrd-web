import { IconBase, type IconProps } from './IconBase';

/**
 * Downward chevron for triggers that expand below — select-style pickers,
 * collapsible sections and "show more" controls. Pair with an accessible
 * name on the button that hosts it.
 */
export function ChevronDownIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5 9 7 7 7-7" />
    </IconBase>
  );
}
