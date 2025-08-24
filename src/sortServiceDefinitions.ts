import { readdirSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import {
  actionsLocation,
  conditionKeysLocation,
  jsonDocsLocation,
  resourceTypesLocation,
  serviceInfoLocation
} from './util/consts.js'

/**
 * Takes the parsed JSON files and sorts them into a structure to publish.
 */

const files = readdirSync(jsonDocsLocation)

type Actions = Record<string, any>
type ResourceTypes = Record<string, any>
type ConditionKeys = Record<string, any>
type InfoByService = Record<
  string,
  {
    name: string
    prefix: string
    actions: Actions
    resourceTypes: ResourceTypes
    conditionKeys: ConditionKeys
  }
>

type UnassociatedConditionKeys = Record<string, string[]>
type ConditionPatterns = Record<string, Record<string, string>>

function getInformationByService(): [InfoByService, UnassociatedConditionKeys, ConditionPatterns] {
  const infoByService: InfoByService = {}
  const unassociatedConditionKeys: UnassociatedConditionKeys = {}
  const conditionPatterns: ConditionPatterns = {}

  for (const file of files) {
    const fileContents = require(join(jsonDocsLocation, file))

    if (!fileContents.prefix || !fileContents.actions || fileContents.actions.length === 0) {
      continue
    }

    const servicePrefix = fileContents.prefix.toLowerCase()

    // Remove the service prefix from unassociated condition keys
    delete unassociatedConditionKeys[servicePrefix]

    infoByService[servicePrefix] ||= {
      name: fileContents.name,
      prefix: fileContents.prefix,
      actions: {},
      resourceTypes: {},
      conditionKeys: {}
    }

    for (const action of fileContents.actions || []) {
      infoByService[fileContents.prefix].actions[action.name.toLowerCase()] = action
    }
    for (const resourceType of fileContents.resourceTypes || []) {
      infoByService[fileContents.prefix].resourceTypes[resourceType.key.toLowerCase()] =
        resourceType
    }
    for (const conditionKey of fileContents.conditionKeys || []) {
      infoByService[fileContents.prefix].conditionKeys[conditionKey.key.toLowerCase()] =
        conditionKey
      const conditionPrefix = conditionKey.key.split(':')[0]
      if (
        conditionPrefix !== 'aws' &&
        conditionPrefix !== servicePrefix &&
        !infoByService[conditionPrefix]
      ) {
        if (!unassociatedConditionKeys[conditionPrefix]) {
          unassociatedConditionKeys[conditionPrefix] = []
        }
        if (!unassociatedConditionKeys[conditionPrefix].includes(servicePrefix)) {
          unassociatedConditionKeys[conditionPrefix].push(servicePrefix)
        }
      }

      if (conditionKey.key.includes('$') && !conditionKey.key.startsWith('aws:')) {
        const parts = conditionKey.key.split('$')
        if (parts.length > 2) {
          throw new Error(`Unexpected format for key: ${conditionKey.key}`)
        }
        if (!conditionPatterns[conditionPrefix]) {
          conditionPatterns[conditionPrefix] = {}
        }
        const pattern = conditionKey.key.replace(/\$\{.*\}/, '.+?')
        conditionPatterns[conditionPrefix][pattern] = conditionKey.key
      }
    }
  }
  return [infoByService, unassociatedConditionKeys, conditionPatterns]
}

async function run() {
  await mkdir(jsonDocsLocation, { recursive: true })
  await mkdir(serviceInfoLocation, { recursive: true })
  await mkdir(actionsLocation, { recursive: true })
  await mkdir(resourceTypesLocation, { recursive: true })
  await mkdir(conditionKeysLocation, { recursive: true })

  const [infoByService, unassociatedConditionKeys, conditionPatterns] = getInformationByService()
  const serviceKeys = Object.keys(infoByService).sort()
  const serviceNames = serviceKeys.reduce(
    (acc, key) => {
      acc[key.toLowerCase()] = infoByService[key].name
      return acc
    },
    {} as Record<string, string>
  )

  await writeFile(join(serviceInfoLocation, 'services.json'), JSON.stringify(serviceKeys, null, 2))
  await writeFile(
    join(serviceInfoLocation, 'serviceNames.json'),
    JSON.stringify(serviceNames, null, 2)
  )
  for (const service in infoByService) {
    await writeFile(
      join(actionsLocation, service + '.json'),
      JSON.stringify(infoByService[service].actions, null, 2)
    )
    await writeFile(
      join(resourceTypesLocation, service + '.json'),
      JSON.stringify(infoByService[service].resourceTypes, null, 2)
    )
    await writeFile(
      join(conditionKeysLocation, service + '.json'),
      JSON.stringify(infoByService[service].conditionKeys, null, 2)
    )
  }

  await writeFile(
    join(serviceInfoLocation, 'unassociatedConditions.json'),
    JSON.stringify(unassociatedConditionKeys, null, 2)
  )

  await writeFile(
    join(serviceInfoLocation, 'conditionPatterns.json'),
    JSON.stringify(conditionPatterns, null, 2)
  )
}

run()
  .catch((e) => {
    console.log(e)
    process.exit(1)
  })
  .then(() => console.log('done'))
