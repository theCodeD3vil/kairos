declare module 'react-file-icon' {
  import type { CSSProperties, SVGProps } from 'react';

  export type FileIconGlyph =
    | '3d'
    | 'acrobat'
    | 'android'
    | 'audio'
    | 'binary'
    | 'code'
    | 'compressed'
    | 'document'
    | 'drive'
    | 'font'
    | 'image'
    | 'presentation'
    | 'settings'
    | 'spreadsheet'
    | 'vector'
    | 'video';

  export type FileIconStyle = Partial<{
    color: string;
    extension: string;
    fold: boolean;
    foldColor: string;
    glyphColor: string;
    gradientColor: string;
    gradientOpacity: number;
    labelColor: string;
    labelTextColor: string;
    labelUppercase: boolean;
    radius: number;
    type: FileIconGlyph;
  }>;

  export function FileIcon(
    props: SVGProps<SVGSVGElement> & {
      extension?: string;
      style?: CSSProperties;
    } & FileIconStyle,
  ): JSX.Element;

  export const defaultStyles: Record<string, FileIconStyle>;
}
