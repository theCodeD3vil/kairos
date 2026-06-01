import type { EditorKind, ExtensionInfo } from './types';

type Assert<T extends true> = T;

type FreshEditorIsSupported = Assert<'fresh' extends EditorKind ? true : false>;
type FreshExtensionInfoIsSupported = Assert<
  { editor: 'fresh' } extends Pick<ExtensionInfo, 'editor'> ? true : false
>;
