import { IconBase, type IconProps } from './IconBase';

/**
 * Magnifier for search affordances — query inputs, list filters and search
 * submit buttons. Decorative: label the field or button it lives in rather
 * than naming the glyph itself.
 */
export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M16 16 20.5 20.5" />
    </IconBase>
  );
}
