import { IconBase, type IconProps } from './IconBase';

/**
 * Triangle with an exclamation mark for warnings, load failures and inline
 * field validation. Never the only signal — always pair it with the message
 * it introduces so the state stays readable without colour or shape alone.
 */
export function AlertIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3 2.5 19.5h19L12 3Z" />
      <path d="M12 9v4.5" />
      <path d="M12 16.5h.01" />
    </IconBase>
  );
}
