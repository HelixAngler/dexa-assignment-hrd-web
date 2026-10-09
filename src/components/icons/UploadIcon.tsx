import { IconBase, type IconProps } from './IconBase';

/**
 * Up arrow rising out of a tray for file-upload actions such as choosing a
 * profile photo. Decorative; the file input or button it belongs to owns the
 * accessible name and the 44×44 px target.
 */
export function UploadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 10 12 5l5 5" />
      <path d="M12 5v11" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </IconBase>
  );
}
