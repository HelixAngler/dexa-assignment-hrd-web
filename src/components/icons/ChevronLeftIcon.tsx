import { IconBase, type IconProps } from './IconBase';

/**
 * Left-pointing chevron for back navigation and for stepping to the previous
 * page, day or range in a sequence.
 */
export function ChevronLeftIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m15 5-7 7 7 7" />
    </IconBase>
  );
}
