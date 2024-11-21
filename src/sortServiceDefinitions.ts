import { readdirSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { filesLocation, jsonDocsLocaiton } from './util/consts.js';

/**
 * Takes the parsed JSON files and sorts them into a structure to publish.
 */

const files = readdirSync(jsonDocsLocaiton)
const serviceInfoLocation = join(filesLocation, 'serviceInfo')
const actionsLocation = join(serviceInfoLocation, 'actions')
const resourceTypesLocation = join(serviceInfoLocation, 'resourceTypes')
const conditionKeysLocation = join(serviceInfoLocation, 'conditionKeys')

type Actions = Record<string, any>
type ResourceTypes = Record<string, any>
type ConditionKeys = Record<string, any>
type InfoByService =  Record<string, {
  name: string,
  prefix: string,
  actions: Actions,
  resourceTypes: ResourceTypes,
  conditionKeys: ConditionKeys
}>

const allDataTypes = new Set<string>()

function getInformationByService(): InfoByService {
  const infoByService: InfoByService = {}
  for(const file of files) {
    const fileContents = require(join(jsonDocsLocaiton, file))

    if (!fileContents.prefix || !fileContents.actions || fileContents.actions.length === 0) {
      continue
    }

    infoByService[fileContents.prefix.toLowerCase()] ||= {
      name: fileContents.name,
      prefix: fileContents.prefix,
      actions: {},
      resourceTypes: {},
      conditionKeys: {}
    }

    for(const action of fileContents.actions || []) {
      infoByService[fileContents.prefix].actions[action.name.toLowerCase()] = action
    }
    for(const resourceType of fileContents.resourceTypes || []) {
      infoByService[fileContents.prefix].resourceTypes[resourceType.key.toLowerCase()] = resourceType
    }
    for(const conditionKey of fileContents.conditionKeys || []) {
      infoByService[fileContents.prefix].conditionKeys[conditionKey.key.toLowerCase()] = conditionKey
      allDataTypes.add(conditionKey.type)
    }
  }
  return infoByService
}

async function run() {
  await mkdir(jsonDocsLocaiton, {recursive: true})
  await mkdir(serviceInfoLocation, {recursive: true})
  await mkdir(actionsLocation, {recursive: true})
  await mkdir(resourceTypesLocation, {recursive: true})
  await mkdir(conditionKeysLocation, {recursive: true})

  const infoByService = getInformationByService()
  const serviceKeys = Object.keys(infoByService).sort()
  const serviceNames = serviceKeys.reduce((acc, key) => {
    acc[key.toLowerCase()] = infoByService[key].name
    return acc
  }, {} as Record<string, string>)

  await writeFile(join(serviceInfoLocation, 'services.json'), JSON.stringify(serviceKeys, null, 2))
  await writeFile(join(serviceInfoLocation, 'serviceNames.json'), JSON.stringify(serviceNames, null, 2))
  for(const service in infoByService) {
    await writeFile(join(actionsLocation, service + '.json'), JSON.stringify(infoByService[service].actions, null, 2))
    await writeFile(join(resourceTypesLocation, service + '.json'), JSON.stringify(infoByService[service].resourceTypes, null, 2))
    await writeFile(join(conditionKeysLocation, service + '.json'), JSON.stringify(infoByService[service].conditionKeys, null, 2))
  }
}

run().catch(
  (e) => {
    console.log(e)
    process.exit(1)
}).then(() => console.log('done'))
