import { IconBase, type IconProps } from './IconBase';

/**
 * Tick mark for confirmations: success toasts, completed steps and positive
 * status pills. Decorative by default, so the surrounding text carries the
 * meaning for assistive technology.
 */
export function CheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 12.5 10 18l9.5-11.5" />
    </IconBase>
  );
}
