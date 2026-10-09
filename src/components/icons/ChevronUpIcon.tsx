import { IconBase, type IconProps } from './IconBase';

/**
 * Upward chevron for controls that collapse upward or open above their
 * trigger — pinned menus and "show less" toggles.
 */
export function ChevronUpIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5 15 7-7 7 7" />
    </IconBase>
  );
}
