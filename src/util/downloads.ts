import { writeFile } from 'fs/promises';

/**
 * Download a url to a file
 * @param fromUrl The url to download from
 * @param toLocation The location to download to
 */
export async function downloadUrlToFile(fromUrl: string, toLocation: string) {
  const response = await fetch(fromUrl);
  const rootPage = await response.text();
  await writeFile(toLocation, rootPage)
}

/**
 * Does a little clean up of the relative paths found in the index page.
 * Right now they all start with a `./` which we can clean up easily.
 * Making it a separate method so when it breaks in two years I can remember
 * why we did this.
 *
 * @param urlRoot The root url to pull from
 * @param relativeUrl The relative url to pull from
 * @returns Returns a full url to download
 */
export function makeFullUrl(urlRoot: string, relativeUrl: string): string {
  if(relativeUrl.startsWith('./')) {
    return urlRoot + relativeUrl.substring(2)
  }
  return urlRoot + relativeUrl
}