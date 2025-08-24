import { Cheerio, CheerioAPI } from 'cheerio'
import { Element } from 'domhandler'
import { Action, ActionResourceType, Scenario } from '../util/serviceDefinition.js'
import { ProblemRow } from './ProblemRow.js'

interface ResourceTypeReference {
  name: string
  required: boolean
}

//[Action, Description, Access Level] --one or many--> Resource Types(required), Condition Keys, Dependent Actions
// Description may have Scenarios in it.

export function parseActions(doc: CheerioAPI): Action[] {
  const table = doc('th:contains("Actions")').parents('table')
  const actionRows = findActionRows(doc, table)

  return actionRows.map((row) => getActionFromRow(doc, row))
}

function parseName(nameText: string): { name: string; isPermissionOnly?: boolean } {
  nameText = nameText.trim()
  const isPermissionOnly = nameText.endsWith('[permission only]') ? true : undefined
  return {
    name: nameText.trim().split(/\s/)[0],
    isPermissionOnly
  }
}

function getActionFromRow(doc: CheerioAPI, row: Cheerio<Element>): Action {
  const columns = row.find('td')
  const firstColumnRowspan = doc(columns.get(0)).attr('rowspan')
  const secondColumnRowspan = doc(columns.get(1)).attr('rowspan')!

  if (!firstColumnRowspan) {
    return parseSingleRowAction(doc, row)
  }

  if (firstColumnRowspan === secondColumnRowspan) {
    return parseSimpleMultiRowAction(doc, row, parseInt(firstColumnRowspan))
  }

  if (parseInt(firstColumnRowspan) > parseInt(secondColumnRowspan)) {
    return parseScenarioMultiRowAction(doc, row, parseInt(firstColumnRowspan))
  }

  console.log(row.html())
  throw new Error('No way to parse row')
}

function parseSingleRowAction(doc: CheerioAPI, row: Cheerio<Element>): Action {
  const columns = row.find('td')
  const { name, isPermissionOnly } = parseName(doc(columns.get(0)).text())
  const description = doc(columns.get(1)).text().trim()
  const accessLevel = doc(columns.get(2)).text().trim()
  const resourceType = parseResourceTypeRef(doc(columns.get(3)).text().trim())
  const conditionKeys = doc(columns.get(4))
    .find('a')
    .map((i, el) => doc(el).text().trim())
    .get()
  const dependentActions = doc(columns.get(5))
    .find('p')
    .map((i, el) => doc(el).text().trim())
    .get()

  return {
    name,
    isPermissionOnly,
    description,
    accessLevel,
    resourceTypes: resourceType
      ? [{ ...resourceType, conditionKeys: [], dependentActions: [] }]
      : [],
    conditionKeys,
    dependentActions
  }
}

function parseSimpleMultiRowAction(
  doc: CheerioAPI,
  row: Cheerio<Element>,
  numberOfRows: number
): Action {
  const columns = row.find('td')
  const { name, isPermissionOnly } = parseName(doc(columns.get(0)).text())
  const description = doc(columns.get(1)).text().trim()
  const accessLevel = doc(columns.get(2)).text().trim()

  //Gather up all the rows, these will be the different resource types.
  const allRows = []
  for (let i = numberOfRows; i > 0; i--) {
    allRows.push(row)
    row = row.next()
  }

  //Now parse out the resource types.
  let conditionKeys: string[] = []
  let dependentActions: string[] = []
  const resourceTypes: ActionResourceType[] = []

  for (let row of allRows) {
    const resourceType = parseResourceTypeFromRow(doc, row)
    if (resourceType.name === undefined) {
      conditionKeys = resourceType.conditionKeys || []
      dependentActions = resourceType.dependentActions || []
    } else {
      resourceTypes.push(resourceType as ActionResourceType)
    }
  }

  return {
    name,
    isPermissionOnly,
    description,
    accessLevel,
    resourceTypes,
    conditionKeys,
    dependentActions
  }
}

function parseScenarioMultiRowAction(
  doc: CheerioAPI,
  row: Cheerio<Element>,
  numberOfRows: number
): Action {
  const columns = row.find('td')
  const secondColumnRowspan = doc(columns.get(1)).attr('rowspan')!
  const initialRow = row

  const allRows: Cheerio<Element>[] = []
  for (let i = numberOfRows; i > 0; i--) {
    allRows.push(row)
    row = row.next()
  }

  const theAction = parseSimpleMultiRowAction(doc, initialRow, parseInt(secondColumnRowspan))

  const scenarioRows = allRows.filter((row) => row.find('td').length === 5)
  theAction.scenarios = scenarioRows.map((row) => parseScenarioRow(doc, row))

  return theAction
}

function parseScenarioRow(doc: CheerioAPI, row: Cheerio<Element>): Scenario {
  const columns = row.find('td')
  const nameCell = doc(columns.get(0)).text().trim()
  //Chop off "SCENARIO:"
  const name = nameCell.substring(10, nameCell.length).trim()
  const resourceTypes = doc(columns.get(2))
    .find('a')
    .map((i, el) => doc(el).text().trim())
    .get()
    .map((s) => parseResourceTypeRef(s))
    .filter((r) => r !== undefined) as ActionResourceType[]

  const conditionKeys = doc(columns.get(3)).text().trim()
  if (conditionKeys !== '') {
    throw new Error('Found condition keys where unexpected in scenario row: ' + row.html())
  }
  const dependentActions = doc(columns.get(4)).text().trim()
  if (dependentActions !== '') {
    throw new Error('Found dependent actions where unexpected in scenario row: ' + row.html())
  }

  return {
    name,
    resourceTypes: resourceTypes
  }
}

function parseResourceTypeFromRow(
  doc: CheerioAPI,
  row: Cheerio<Element>
): Partial<ActionResourceType> {
  const columns = row.find('td')
  const startAt = columns.length === 6 ? 3 : 0

  //TODO: Add a check for multiple resource types in a single row.
  if (doc(columns.get(startAt)).find('a').length > 1) {
    throw new Error('Multiple resource types in a single row: ' + row.html())
  }
  const resourceTypeRef = parseResourceTypeRef(doc(columns.get(startAt)).text().trim())
  const conditionKeys = doc(columns.get(startAt + 1))
    .find('a')
    .map((i, el) => doc(el).text().trim())
    .get()
  const dependentActions = doc(columns.get(startAt + 2))
    .find('p')
    .map((i, el) => doc(el).text().trim())
    .get()

  return {
    name: resourceTypeRef?.name,
    required: resourceTypeRef?.required,
    conditionKeys: conditionKeys,
    dependentActions: dependentActions
  }
}

function parseResourceTypeRef(cellContents: string): ResourceTypeReference | undefined {
  if (cellContents === '') {
    return undefined
  }

  let name = cellContents
  let required = false

  if (name.endsWith('*')) {
    ;((name = name.substring(0, cellContents.length - 1)), (required = true))
  }

  return {
    name,
    required
  }
}

function findActionRows(doc: CheerioAPI, table: Cheerio<Element>) {
  const rows = table.find('tbody tr')
  const actionRows: Cheerio<Element>[] = []
  rows.each((i, el) => {
    const row = doc(el)
    const hasSixColumns = row.find('td').length === 6
    if (hasSixColumns) {
      actionRows.push(row)
    }
  })

  return actionRows
}

/**
 * Verifies various assumptions made about the actions table before we parse it.  This will
 * return errors if any of those assumptions are no longer true.
 *
 * @param doc The cheerio document
 * @param table The actions table element
 * @returns Returns an array of errors found, or an empty array if no errors were found.
 */
export function verifyActionTableAssumptions(
  doc: CheerioAPI,
  table: Cheerio<Element>
): ProblemRow[] {
  return [...verifyRowspanAssumptions(doc, table), ...verifyColspanAssumptions(doc, table)]
}

/**
 * Verifies that now cells in the table have a colspan attribute
 * @param doc The cheerio document
 * @param table The table
 */
export function verifyColspanAssumptions(doc: CheerioAPI, table: Cheerio<Element>): ProblemRow[] {
  const rows = table.find('tr')
  const errorRows: ProblemRow[] = []
  rows.each((i, el) => {
    const row = doc(el)
    const hasColspans = row.find('td[colspan]').length > 0
    if (hasColspans) {
      errorRows.push({ problemDescription: 'found colspan', html: row.html()! })
    }
  })

  return errorRows
}

export function verifyRowspanAssumptions(doc: CheerioAPI, table: Cheerio<Element>): ProblemRow[] {
  const rows = table.find('tbody tr')
  const errorRows: ProblemRow[] = []
  rows.each((i, el) => {
    const row = doc(el)
    const hasRowspans = row.find('td[rowspan]').length > 0
    const hasSixColumns = row.find('td').length === 6
    if (!hasRowspans) {
      return
    }
    const previousRow = row.prev()
    const previousRowHasRowspan = previousRow.find('td[rowspan]').length > 0
    if (previousRowHasRowspan) {
      errorRows.push({ problemDescription: 'previous row has rowspan', html: row.html()! })
      return
    }

    if (hasRowspans && !hasSixColumns) {
      errorRows.push({ problemDescription: 'does not have six columns', html: row.html()! })
      return
    }
    const columns = row.find('td')
    const firstColumnRowspan = doc(columns.get(0)).attr('rowspan')
    const secondColumnRowspan = doc(columns.get(1)).attr('rowspan')
    const thirdColumnRowspan = doc(columns.get(2)).attr('rowspan')

    if (!firstColumnRowspan || !secondColumnRowspan || !thirdColumnRowspan) {
      errorRows.push({
        problemDescription: 'missing rowspan in first three columns',
        html: row.html()!
      })
      return
    }

    //is the first column rowspan less than the second column rowspan?
    if (parseInt(firstColumnRowspan) < parseInt(secondColumnRowspan)) {
      errorRows.push({
        problemDescription: 'first column rowspan should be the biggest',
        html: row.html()!
      })
      return
    }

    if (parseInt(secondColumnRowspan) != parseInt(thirdColumnRowspan)) {
      errorRows.push({
        problemDescription: 'second and third column rowspan should be equal',
        html: row.html()!
      })
      return
    }

    //make sure the last three columns have no rowspan
    const fourthColumnRowspan = doc(columns.get(3)).attr('rowspan')
    const fifthColumnRowspan = doc(columns.get(4)).attr('rowspan')
    const sixthColumnRowspan = doc(columns.get(5)).attr('rowspan')
    if (fourthColumnRowspan || fifthColumnRowspan || sixthColumnRowspan) {
      errorRows.push({
        problemDescription: 'found rowspan in last three columns',
        html: row.html()!
      })
      return
    }
  })

  return errorRows
}
