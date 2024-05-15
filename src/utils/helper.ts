import { replace } from 'lodash';

/**
 * It takes a filename, replaces spaces with dashes, adds a timestamp, and returns the new filename
 * @param {string} filename - string - The name of the file you want to rename.
 */
export const getFileName = (filename: string): string => {
  const fileReplaceSpace = replace(filename, / /g, '-');
  return (
    fileReplaceSpace.split('.')[0] +
    '-' +
    Date.now() +
    '.' +
    fileReplaceSpace.split('.')[1]
  );
};
