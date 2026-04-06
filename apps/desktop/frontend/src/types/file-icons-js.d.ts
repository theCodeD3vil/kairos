declare module '@exuanbo/file-icons-js' {
  type GetClassOptions = {
    color?: boolean;
    array?: boolean;
  };

  type FileIconsClient = {
    getClass(name: string, options?: GetClassOptions): Promise<string | string[]>;
  };

  const fileIcons: FileIconsClient;

  export default fileIcons;
}
