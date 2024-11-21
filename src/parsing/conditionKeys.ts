import { Cheerio, CheerioAPI } from 'cheerio'
import { Element } from 'domhandler'
import { ConditionKey } from '../util/serviceDefinition.js'
import { ProblemRow } from "./ProblemRow.js"

export function findConditionKeysTable(doc: CheerioAPI): Cheerio<Element>|undefined {
  const noConditionTypesMessage = doc('p:contains("has no service-specific context keys that can be used")')
  if(noConditionTypesMessage.length > 0) {
    // console.log(noResourceTypesMessage.html());
    return undefined
  }
  return doc('thead:contains("Condition keys"):contains("Description"):contains("Type")').parents('table')
}

export function parseConditionKeys(doc: CheerioAPI): ConditionKey[]|undefined {
  const table = findConditionKeysTable(doc)
  if(!table) {
    return undefined
  }

  const rows = table.find('tbody tr')
  const conditionKeys = rows.toArray().map((row) => parseConditionKeyRow(doc, doc(row)))

  return conditionKeys
}

function parseConditionKeyRow(doc: CheerioAPI, row: Cheerio<Element>): ConditionKey {
  const cols = row.find('td')
  const key = doc(cols[0]).text().trim()
  const description = doc(cols[1]).text().trim()
  const type = doc(cols[2]).text().trim()

  return {
    key,
    description,
    type
  }
}


export function verifyConditionKeysTableAssumptions(doc: CheerioAPI, table: Cheerio<Element>): ProblemRow[] {
  const problemRows: ProblemRow[] = []
  const rows = table.find('tbody tr')

  const errorRows: ProblemRow[] = []
  rows.each((i, el) => {
    const row = doc(el)
    if(row.find('td[rowspan]').length > 0) {
      problemRows.push({problemDescription: 'Rowspan found in conditions table', html: row.html()!})
    }
    if(row.find('td[colspan]').length > 0) {
      problemRows.push({problemDescription: 'Colspan found in conditions table', html: row.html()!})
    }
    if(row.find('td').length !== 3) {
      problemRows.push({problemDescription: 'Conditions row does not have exactly three columns', html: row.html()!})
    }

  })
  return problemRows
}