import { load } from 'cheerio'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { htmlDownloadLocation } from '../util/consts.js'
import { verifyActionTableAssumptions } from './actions.js'
import { findConditionKeysTable, verifyConditionKeysTableAssumptions } from './conditionKeys.js'
import { findResourceTypesTable, verifyResourceTypesTableAssumptions } from './resourceTypes.js'

export async function verifyHtmlFileAssumptions(file: string) {
  const fileContents = await readFile(join(htmlDownloadLocation, file), 'utf-8')
  const doc = load(fileContents)
  const actionsTable = doc('th:contains("Actions")').parents('table')

  const problemRows = verifyActionTableAssumptions(doc, actionsTable)
  const resourceTypesTable = findResourceTypesTable(doc)
  if (resourceTypesTable) {
    problemRows.push(...verifyResourceTypesTableAssumptions(doc, resourceTypesTable))
  }

  const conditionKeysTable = findConditionKeysTable(doc)
  if (conditionKeysTable) {
    problemRows.push(...verifyConditionKeysTableAssumptions(doc, conditionKeysTable))
  }

  if (problemRows.length > 0) {
    console.log(problemRows)
    throw new Error('Incorrect assumptions found')
  }
}
