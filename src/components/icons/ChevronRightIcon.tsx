import { IconBase, type IconProps } from './IconBase';

/**
 * Right-pointing chevron for forward steps — next page or date controls and
 * drill-in affordances on list rows.
 */
export function ChevronRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m9 5 7 7-7 7" />
    </IconBase>
  );
}
