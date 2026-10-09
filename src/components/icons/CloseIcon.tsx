import { IconBase, type IconProps } from './IconBase';

/**
 * Cross mark for dismiss actions — banner close buttons, overlay dismissal
 * and "clear" controls. The host button needs an accessible name; this glyph
 * stays decorative.
 */
export function CloseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </IconBase>
  );
}
