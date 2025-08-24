import { Cheerio, CheerioAPI } from 'cheerio'
import { Element } from 'domhandler'
import { ResourceType } from '../util/serviceDefinition.js'
import { ProblemRow } from './ProblemRow.js'

export function findResourceTypesTable(doc: CheerioAPI): Cheerio<Element> | undefined {
  const noResourceTypesMessage = doc('p:contains("does not support specifying a resource ARN")')
  if (noResourceTypesMessage.length > 0) {
    // console.log(noResourceTypesMessage.html());
    return undefined
  }
  return doc('thead:contains("Resource types"):contains("ARN")').parents('table')
}

export function parseResourceTypes(doc: CheerioAPI): ResourceType[] | undefined {
  const table = findResourceTypesTable(doc)
  if (!table) {
    return undefined
  }

  const rows = table.find('tbody tr')
  const resourceTypes = rows.toArray().map((row) => parseResourceTypeRow(doc, doc(row)))

  return resourceTypes
}

function parseResourceTypeRow(doc: CheerioAPI, row: Cheerio<Element>): ResourceType {
  const cols = row.find('td')
  const key = doc(cols[0]).text().trim()
  const arn = doc(cols[1]).text().trim()
  const conditionKeysCell = doc(cols[2]).text().trim()

  let conditionKeys = undefined
  if (conditionKeysCell !== '') {
    conditionKeys = doc(cols[2])
      .find('a')
      .toArray()
      .map((a) => doc(a).text().trim())
  }

  return {
    key,
    arn,
    conditionKeys
  }
}

export function verifyResourceTypesTableAssumptions(
  doc: CheerioAPI,
  table: Cheerio<Element>
): ProblemRow[] {
  const problemRows: ProblemRow[] = []
  const rows = table.find('tbody tr')

  const errorRows: ProblemRow[] = []
  rows.each((i, el) => {
    const row = doc(el)
    if (row.find('td[rowspan]').length > 0) {
      problemRows.push({
        problemDescription: 'Rowspan found in resource types table',
        html: row.html()!
      })
    }
    if (row.find('td[colspan]').length > 0) {
      problemRows.push({
        problemDescription: 'Colspan found in resource types table',
        html: row.html()!
      })
    }
    if (row.find('td').length !== 3) {
      problemRows.push({
        problemDescription: 'Row does not have exactly three columns',
        html: row.html()!
      })
    }
  })
  return problemRows
}
