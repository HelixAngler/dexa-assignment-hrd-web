import type { ReactNode, SVGProps } from 'react';

export interface IconProps
  extends Omit<SVGProps<SVGSVGElement>, 'children' | 'width' | 'height' | 'viewBox'> {
  /** Rendered edge length of the glyph; a number is read as px. Defaults to 24. */
  size?: number | string;
  /**
   * Accessible name for the glyph. Supply it only when the icon carries
   * meaning that no surrounding text conveys; otherwise leave it unset so
   * the icon stays decorative and out of the accessibility tree.
   */
  title?: string;
}

export interface IconBaseProps extends IconProps {
  /** The glyph geometry drawn inside the canvas. */
  children: ReactNode;
}

/**
 * Shared shell of the icon set: a 24×24 canvas drawn with 2 px round-capped,
 * round-joined strokes in `currentColor`, so every glyph inherits the text
 * colour of the surface it sits on. Without `title` the glyph is decorative
 * (`aria-hidden="true"`, `focusable="false"`); with `title` it becomes a
 * labelled image (`role="img"` plus a `<title>` element). The glyph itself
 * is not a hit target — when an icon is a control's only content, size that
 * control to at least 44×44 px so the affordance stays easy to tap.
 */
export function IconBase({ size = 24, title, children, ...rest }: IconBaseProps) {
  const labelled = title !== undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : true}
      {...rest}
    >
      {labelled ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}
