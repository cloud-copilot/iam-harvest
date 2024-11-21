import { load } from 'cheerio';
import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { parseActions } from './parsing/actions.js';
import { parseConditionKeys } from './parsing/conditionKeys.js';
import { parseResourceTypes } from './parsing/resourceTypes.js';
import { verifyHtmlFileAssumptions } from './parsing/verifyAssumptions.js';
import { htmlDownloadLocation, jsonDocsLocaiton as jsonDocsLocation } from './util/consts.js';
import { ServiceDefinition } from './util/serviceDefinition.js';

async function parseFile(filename: string): Promise<ServiceDefinition> {
  const fileContents = await readFile(join(htmlDownloadLocation, filename), 'utf-8');
  const serviceName = filename.substring(0, filename.length - 5);
  const doc = load(fileContents)
  const prefix = doc('p:contains("service prefix:")').find('.code').text()

  const actions = parseActions(doc)
  const resourceTypes = parseResourceTypes(doc)
  const conditionKeys = parseConditionKeys(doc)

  return {
    name: serviceName,
    prefix,
    actions,
    resourceTypes,
    conditionKeys
  }
}

async function verifyAllFiles() {
  const files = await readdir(htmlDownloadLocation)
  for (const file of files) {
    if(file === 'index.html') continue;
    await verifyHtmlFileAssumptions(file)
  }
}

async function parseAllFiles(){
  const files = await readdir(htmlDownloadLocation)
  for (const file of files) {
    if(file === 'index.html') continue;
    const definition = await parseFile(file)
    await writeFile(join(jsonDocsLocation, definition.name + '.json'), JSON.stringify(definition, null, 2))
  }
}

async function run() {
  await mkdir(jsonDocsLocation, {recursive: true})
  await verifyAllFiles()
  await parseAllFiles()
}

run().catch(
  (e) => {
    console.log(e)
    process.exit(1)
}).then(() => console.log('done'))
